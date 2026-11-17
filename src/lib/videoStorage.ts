import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { VideoAsset, VideoChunk, VideoVariant } from '../types/catalog';

export const MAX_HERO_VIDEO_BYTES = 36_700_160; // ~35 MB
const CHUNK_RAW_BYTES = 360_000; // ~480 KB base64 (< 700,000 char rule limit)

const blobUrlCache = new Map<string, string>();
const inFlightLoads = new Map<string, Promise<string | null>>();

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const sliceSize = 0x8000;
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const slice = bytes.subarray(i, i + sliceSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function formatVideoFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export function validateVideoFile(file: File): void {
  const isVideoMime =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  if (!isVideoMime) {
    throw new Error('Please choose a valid video file (MP4, WebM, or MOV).');
  }
  if (file.size <= 0) {
    throw new Error('The selected video file appears to be empty.');
  }
  if (file.size > MAX_HERO_VIDEO_BYTES) {
    throw new Error(
      `Video file (${formatVideoFileSize(file.size)}) exceeds the 35 MB permanent cloud storage limit. Please compress or trim the clip before uploading.`
    );
  }
}

export async function uploadVideoAssetToFirestore(params: {
  file: File;
  variant: VideoVariant;
  name?: string;
  onProgress?: (percent: number) => void;
}): Promise<VideoAsset> {
  const { file, variant, name, onProgress } = params;
  validateVideoFile(file);

  const mimeType = (
    file.type && file.type.startsWith('video/') ? file.type : 'video/mp4'
  ).slice(0, 60);

  const arrayBuffer = await file.arrayBuffer();
  const totalBytes = arrayBuffer.byteLength;
  const chunkCount = Math.max(1, Math.ceil(totalBytes / CHUNK_RAW_BYTES));

  if (chunkCount > 110) {
    throw new Error('Video exceeds maximum allowed segment count.');
  }

  const videoId = `vid-${variant}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = (name || file.name || `hero-${variant}-video`)
    .trim()
    .slice(0, 160);

  const parentPayload = {
    id: videoId,
    name: cleanName || `Hero ${variant} video`,
    variant,
    mimeType,
    sizeBytes: totalBytes,
    chunkCount,
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  onProgress?.(2);

  // Create parent metadata document FIRST so child /chunks rules pass exists() check
  try {
    await setDoc(doc(db, 'video_assets', videoId), parentPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `video_assets/${videoId}`);
  }

  const fullBytes = new Uint8Array(arrayBuffer);

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNK_RAW_BYTES;
    const end = Math.min(totalBytes, start + CHUNK_RAW_BYTES);
    const slice = fullBytes.subarray(start, end);
    const base64Data = uint8ArrayToBase64(slice);
    const chunkId = `chunk-${index}`;

    try {
      await setDoc(doc(db, 'video_assets', videoId, 'chunks', chunkId), {
        id: chunkId,
        index,
        data: base64Data,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `video_assets/${videoId}/chunks/${chunkId}`
      );
    }

    const pct = Math.round(((index + 1) / chunkCount) * 96) + 4;
    onProgress?.(Math.min(100, pct));
  }

  // Warm the in-memory object URL cache immediately for seamless preview/playback
  const localBlob = new Blob([fullBytes], { type: mimeType });
  const localUrl = URL.createObjectURL(localBlob);
  blobUrlCache.set(videoId, localUrl);

  return {
    id: videoId,
    name: cleanName,
    variant,
    mimeType,
    sizeBytes: totalBytes,
    chunkCount,
    status: 'active',
  };
}

export async function fetchVideoAssetsList(): Promise<VideoAsset[]> {
  try {
    const q = query(
      collection(db, 'video_assets'),
      where('status', 'in', ['active', 'archived'])
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...(d.data() as VideoAsset), id: d.id }))
      .sort((a, b) => b.id.localeCompare(a.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'video_assets');
  }
}

export async function resolveVideoBlobUrl(videoId?: string): Promise<string | null> {
  if (!videoId) return null;

  const cached = blobUrlCache.get(videoId);
  if (cached) return cached;

  const existingLoad = inFlightLoads.get(videoId);
  if (existingLoad) return existingLoad;

  const loadPromise = (async (): Promise<string | null> => {
    try {
      const metaSnap = await getDoc(doc(db, 'video_assets', videoId));
      if (!metaSnap.exists()) return null;

      const meta = metaSnap.data() as VideoAsset;
      const chunksQuery = query(
        collection(db, 'video_assets', videoId, 'chunks'),
        where('index', '>=', 0),
        orderBy('index', 'asc')
      );
      const chunksSnap = await getDocs(chunksQuery);
      if (chunksSnap.empty) return null;

      const chunks = chunksSnap.docs
        .map((d) => d.data() as VideoChunk)
        .sort((a, b) => a.index - b.index);

      const byteArrays = chunks.map((c) => base64ToUint8Array(c.data));
      const totalLen = byteArrays.reduce((sum, arr) => sum + arr.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const arr of byteArrays) {
        merged.set(arr, offset);
        offset += arr.length;
      }

      const blob = new Blob([merged], {
        type: meta.mimeType || 'video/mp4',
      });
      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(videoId, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      inFlightLoads.delete(videoId);
    }
  })();

  inFlightLoads.set(videoId, loadPromise);
  return loadPromise;
}
