import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { MediaAsset, MediaUsage } from '../types/catalog';

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Compresses an uploaded image file while strictly preserving its original
 * aspect ratio so it fits safely within Firestore 1 MB document boundaries.
 */
export async function compressImagePreserveRatio(
  file: File,
  maxDim = 1600,
  maxChars = 740000
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or unsupported image file'));
      img.onload = () => {
        let currentMax = maxDim;
        let quality = 0.9;
        const preserveAlpha =
          file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';

        for (let attempt = 0; attempt < 5; attempt++) {
          const scale = Math.min(currentMax / img.width, currentMax / img.height, 1);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);

          // Try WebP for crisp quality + smaller size when alpha is present, else JPEG
          const mimeType = preserveAlpha ? 'image/webp' : 'image/jpeg';
          let dataUrl = canvas.toDataURL(mimeType, quality);
          if (dataUrl.length <= maxChars) {
            resolve({ dataUrl, width: w, height: h, mimeType });
            return;
          }
          if (preserveAlpha) {
            // Fallback to JPEG if WebP PNG is still large
            dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.65, quality - 0.1));
            if (dataUrl.length <= maxChars) {
              resolve({ dataUrl, width: w, height: h, mimeType: 'image/jpeg' });
              return;
            }
          }
          currentMax = Math.round(currentMax * 0.78);
          quality = Math.max(0.58, quality - 0.1);
        }

        reject(
          new Error(
            'Image file exceeds the storage size limit even after compression. Please use a smaller image file.'
          )
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageAssetToFirestore(params: {
  file: File;
  usage: MediaUsage;
  name?: string;
  altText?: string;
}): Promise<{ asset: MediaAsset; refUrl: string }> {
  const { file, usage, name, altText } = params;
  const processed = await compressImagePreserveRatio(file);
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanName = (
    name?.trim() ||
    file.name.replace(/\.[^.]+$/, '') ||
    'Uploaded Image'
  ).slice(0, 160);

  const assetPayload: Record<string, unknown> = {
    id,
    name: cleanName,
    usage,
    dataUrl: processed.dataUrl,
    mimeType: processed.mimeType,
    width: processed.width,
    height: processed.height,
    ...(altText?.trim() ? { altText: altText.trim().slice(0, 240) } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const asset: MediaAsset = {
    id,
    name: cleanName,
    usage,
    dataUrl: processed.dataUrl,
    mimeType: processed.mimeType,
    width: processed.width,
    height: processed.height,
    ...(altText?.trim() ? { altText: altText.trim().slice(0, 240) } : {}),
  };

  try {
    const localMap = JSON.parse(localStorage.getItem('sds_local_media_assets_v1') || '{}');
    localMap[id] = asset;
    localStorage.setItem('sds_local_media_assets_v1', JSON.stringify(localMap));
  } catch {
    // Ignore storage errors
  }

  // Persist to server disk so all external browsers receive the media immediately
  try {
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset }),
    });
  } catch {
    // Keep resilient if server api unreachable
  }

  try {
    await setDoc(doc(db, 'media_assets', id), assetPayload);
  } catch (err) {
    console.warn('Firestore media upload fallback to local storage:', err);
  }

  return { asset, refUrl: `media://${id}` };
}

export async function replaceImageAssetFileInFirestore(
  assetId: string,
  file: File
): Promise<ProcessedImageResult> {
  const processed = await compressImagePreserveRatio(file);
  try {
    await updateDoc(doc(db, 'media_assets', assetId), {
      dataUrl: processed.dataUrl,
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `media_assets/${assetId}`);
  }
  return processed;
}

export async function deleteImageAssetFromFirestore(assetId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'media_assets', assetId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `media_assets/${assetId}`);
  }
}
