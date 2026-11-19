import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  Film,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AboutContentBlock,
  AboutPhotoItem,
  MediaFormat,
  SiteContent,
  SiteSettings,
} from '../types/catalog';
import { compressImagePreserveRatio, uploadImageAssetToFirestore } from '../lib/mediaUtils';
import {
  formatVideoFileSize,
  uploadVideoAssetToFirestore,
  validateVideoFile,
} from '../lib/videoStorage';
import { useStore } from '../context/StoreContext';
import { ImageLibraryModal } from './ImageLibraryModal';
import { LoopingVideo } from './LoopingVideo';

export function buildDefaultAboutIntro(settings: SiteSettings): string[] {
  return settings.aboutOverview ? [settings.aboutOverview] : [];
}

export function buildDefaultAboutBlocks(settings: SiteSettings): AboutContentBlock[] {
  return [
    {
      id: 'block-manufacturing',
      heading: 'Manufacturing Capabilities',
      paragraphs: [settings.manufacturingCapabilities],
    },
    {
      id: 'block-quality',
      heading: 'Product Quality & Material Integrity',
      paragraphs: [settings.qualityCommitment],
    },
    {
      id: 'block-experience',
      heading: 'Industry Experience',
      paragraphs: [settings.industryExperience],
    },
    {
      id: 'block-commitment',
      heading: 'Commitment to B2B Customers',
      paragraphs: [settings.customerCommitment],
    },
  ];
}

export function buildDefaultAboutPhotos(): AboutPhotoItem[] {
  return [
    {
      id: 'photo-default-1',
      src: '/images/about_manufacturing_craft_1794728250935.jpg',
      alt: 'SHREE DURGA STEELS stainless steel manufacturing environment',
      caption: '',
      position: '50% 50%',
      fit: 'cover',
      mediaType: 'image',
    },
  ];
}

function parsePositionXY(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.trim().split(/\s+/);
  const parsePct = (s: string | undefined) => {
    if (!s) return 50;
    const n = parseFloat(s.replace('%', ''));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
  };
  return { x: parsePct(parts[0]), y: parsePct(parts[1]) };
}

interface StagedMediaFile {
  type: MediaFormat;
  file: File;
  previewUrl: string;
}

interface AboutEditorPanelProps {
  onClose?: () => void;
  isModal?: boolean;
}

export function AboutEditorPanel({
  onClose,
  isModal = false,
}: AboutEditorPanelProps) {
  const {
    settings,
    adminContent,
    publishedContent,
    draftContent,
    previewMode,
    resolveMediaSrc,
    saveSiteContent,
    discardDraft,
  } = useStore();

  const [introParagraphs, setIntroParagraphs] = useState<string[]>(() =>
    adminContent.aboutIntroParagraphs !== undefined
      ? [...adminContent.aboutIntroParagraphs]
      : buildDefaultAboutIntro(settings)
  );

  const [blocks, setBlocks] = useState<AboutContentBlock[]>(() =>
    adminContent.aboutBlocks !== undefined
      ? adminContent.aboutBlocks.map((b) => ({
          ...b,
          paragraphs: [...b.paragraphs],
        }))
      : buildDefaultAboutBlocks(settings)
  );

  const [photos, setPhotos] = useState<AboutPhotoItem[]>(() =>
    adminContent.aboutPhotos !== undefined
      ? adminContent.aboutPhotos.map((p) => ({ ...p }))
      : buildDefaultAboutPhotos()
  );

  const [placement, setPlacement] = useState<'left' | 'right'>(
    adminContent.aboutImagePlacement || 'left'
  );

  const [stagedFiles, setStagedFiles] = useState<Record<string, StagedMediaFile>>({});
  const [libraryTarget, setLibraryTarget] = useState<
    null | 'add-photo' | string
  >(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync cleanly from Firestore draft/published state after refresh
  useEffect(() => {
    setIntroParagraphs(
      adminContent.aboutIntroParagraphs !== undefined
        ? [...adminContent.aboutIntroParagraphs]
        : buildDefaultAboutIntro(settings)
    );
    setBlocks(
      adminContent.aboutBlocks !== undefined
        ? adminContent.aboutBlocks.map((b) => ({
            ...b,
            paragraphs: [...b.paragraphs],
          }))
        : buildDefaultAboutBlocks(settings)
    );
    setPhotos((prev) => {
      if (Object.keys(stagedFiles).length > 0) return prev;
      return adminContent.aboutPhotos !== undefined
        ? adminContent.aboutPhotos.map((p) => ({ ...p }))
        : buildDefaultAboutPhotos();
    });
    setPlacement(adminContent.aboutImagePlacement || 'left');
  }, [adminContent]);

  const handleStageImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    replacePhotoId?: string
  ) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (replacePhotoId) {
        const file = files[0];
        const processed = await compressImagePreserveRatio(file);
        const existingStaged = stagedFiles[replacePhotoId];
        if (existingStaged?.type === 'video') {
          URL.revokeObjectURL(existingStaged.previewUrl);
        }
        setStagedFiles((prev) => ({
          ...prev,
          [replacePhotoId]: {
            type: 'image',
            file,
            previewUrl: processed.dataUrl,
          },
        }));
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === replacePhotoId
              ? { ...p, mediaType: 'image', videoId: '' }
              : p
          )
        );
      } else {
        const addedItems: AboutPhotoItem[] = [];
        const newStaged: Record<string, StagedMediaFile> = {};
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const processed = await compressImagePreserveRatio(file);
          const itemId = `photo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
          addedItems.push({
            id: itemId,
            src: processed.dataUrl,
            alt: 'SHREE DURGA STEELS facility photograph',
            caption: '',
            position: '50% 50%',
            fit: 'cover',
            mediaType: 'image',
            videoId: '',
          });
          newStaged[itemId] = {
            type: 'image',
            file,
            previewUrl: processed.dataUrl,
          };
        }
        setStagedFiles((prev) => ({ ...prev, ...newStaged }));
        setPhotos((prev) => [...prev, ...addedItems]);
      }
      setStatusMessage(
        'Image preview ready. Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to prepare image preview.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleStageVideo = (
    e: React.ChangeEvent<HTMLInputElement>,
    replacePhotoId?: string
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage(null);
    setStatusMessage(null);
    try {
      validateVideoFile(file);
      const previewUrl = URL.createObjectURL(file);

      if (replacePhotoId) {
        const existingStaged = stagedFiles[replacePhotoId];
        if (existingStaged?.type === 'video') {
          URL.revokeObjectURL(existingStaged.previewUrl);
        }
        setStagedFiles((prev) => ({
          ...prev,
          [replacePhotoId]: {
            type: 'video',
            file,
            previewUrl,
          },
        }));
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === replacePhotoId ? { ...p, mediaType: 'video' } : p
          )
        );
      } else {
        const itemId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setStagedFiles((prev) => ({
          ...prev,
          [itemId]: {
            type: 'video',
            file,
            previewUrl,
          },
        }));
        setPhotos((prev) => [
          ...prev,
          {
            id: itemId,
            src: '/images/about_manufacturing_craft_1794728250935.jpg',
            alt: 'SHREE DURGA STEELS facility video',
            caption: '',
            position: '50% 50%',
            fit: 'cover',
            mediaType: 'video',
            videoId: '',
          },
        ]);
      }

      setStatusMessage(
        `Video preview ready (${file.name} · ${formatVideoFileSize(file.size)}). Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to prepare video preview.'
      );
    }
  };

  const handleSaveAction = async (mode: 'save-draft' | 'preview' | 'publish') => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setUploadStatusText('');

    try {
      const base: SiteContent = adminContent;

      const resolvedPhotos: AboutPhotoItem[] = [];
      for (let idx = 0; idx < photos.length; idx += 1) {
        const item = photos[idx];
        const staged = stagedFiles[item.id];
        let finalSrc = item.src;
        let finalType: MediaFormat = item.mediaType || 'image';
        let finalVideoId = item.videoId || '';

        if (staged?.type === 'image') {
          setUploadStatusText(`Saving image #${idx + 1} permanently...`);
          const res = await uploadImageAssetToFirestore({
            file: staged.file,
            usage: 'about',
            name: `About Us Media (${staged.file.name})`,
          });
          finalSrc = res.refUrl;
          finalType = 'image';
          finalVideoId = '';
        } else if (staged?.type === 'video') {
          setUploadStatusText(`Saving video #${idx + 1} permanently...`);
          const vidRes = await uploadVideoAssetToFirestore({
            file: staged.file,
            variant: 'section',
            name: `About Us Video (${staged.file.name})`,
            onProgress: (pct) =>
              setUploadStatusText(`Saving video #${idx + 1} (${pct}%)...`),
          });
          finalType = 'video';
          finalVideoId = vidRes.id;
          if (!finalSrc || finalSrc.startsWith('data:')) {
            finalSrc = '/images/about_manufacturing_craft_1794728250935.jpg';
          }
        }

        if (finalType === 'image') {
          finalVideoId = '';
        }

        if (finalSrc.trim() || finalVideoId) {
          resolvedPhotos.push({
            id: item.id || `photo-${idx + 1}`,
            src: (finalSrc.trim() || '/images/about_manufacturing_craft_1794728250935.jpg').slice(
              0,
              700000
            ),
            alt: (item.alt || '').trim().slice(0, 200),
            caption: (item.caption || '').trim().slice(0, 200),
            position: item.position || '50% 50%',
            fit: item.fit || 'cover',
            mediaType: finalType,
            ...(finalVideoId ? { videoId: finalVideoId } : {}),
          });
        }
      }

      const cleanedIntro = introParagraphs
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 30);

      const cleanedBlocks: AboutContentBlock[] = blocks
        .map((b, idx) => ({
          id: b.id || `block-${idx + 1}`,
          heading: b.heading.trim().slice(0, 200),
          paragraphs: b.paragraphs
            .map((p) => p.trim().slice(0, 2000))
            .filter(Boolean)
            .slice(0, 20),
        }))
        .filter((b) => b.heading || b.paragraphs.length > 0)
        .slice(0, 30);

      const nextContent: SiteContent = {
        ...base,
        aboutIntroParagraphs: cleanedIntro,
        aboutBlocks: cleanedBlocks,
        aboutPhotos: resolvedPhotos.slice(0, 30),
        aboutImagePlacement: placement,
      };

      await saveSiteContent(nextContent, mode);

      // Clean staged URLs
      for (const st of Object.values(stagedFiles)) {
        if (st.type === 'video') URL.revokeObjectURL(st.previewUrl);
      }
      setStagedFiles({});
      setPhotos(resolvedPhotos.slice(0, 30));

      if (mode === 'save-draft') {
        setStatusMessage(
          'About Us media & text changes saved permanently! Click PUBLISH / UPDATE WEBSITE to apply live.'
        );
      } else if (mode === 'preview') {
        setShowPreview(true);
        setStatusMessage(
          'Draft preview saved permanently. Click PUBLISH / UPDATE WEBSITE when ready.'
        );
      } else {
        setStatusMessage('About Us changes published permanently to live website.');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save About Us changes to Firestore.'
      );
    } finally {
      setSaving(false);
      setUploadStatusText('');
    }
  };

  const handleCancel = () => {
    for (const st of Object.values(stagedFiles)) {
      if (st.type === 'video') URL.revokeObjectURL(st.previewUrl);
    }
    setStagedFiles({});

    if (onClose) {
      onClose();
    } else {
      const resetSource = draftContent || publishedContent;
      setIntroParagraphs(
        resetSource.aboutIntroParagraphs !== undefined
          ? [...resetSource.aboutIntroParagraphs]
          : buildDefaultAboutIntro(settings)
      );
      setBlocks(
        resetSource.aboutBlocks !== undefined
          ? resetSource.aboutBlocks.map((b) => ({
              ...b,
              paragraphs: [...b.paragraphs],
            }))
          : buildDefaultAboutBlocks(settings)
      );
      setPhotos(
        resetSource.aboutPhotos !== undefined
          ? resetSource.aboutPhotos.map((p) => ({ ...p }))
          : buildDefaultAboutPhotos()
      );
      setPlacement(resetSource.aboutImagePlacement || 'left');
      setStatusMessage('Cancelled unsaved About Us edits.');
    }
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    setBlocks(copy);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#B8B8B3]/60 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
            About Us Editor
          </p>
          <h2 className="font-display text-xl font-semibold text-black">
            Edit About Us Paragraphs, Media (Image or Video) &amp; Content Blocks
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSaveAction('save-draft')}
            className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSaveAction('publish')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>PUBLISH / UPDATE WEBSITE</span>
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section A: Introduction Paragraphs */}
      <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
            1. Company Overview Paragraphs ({introParagraphs.length})
          </h3>
          <button
            type="button"
            onClick={() => setIntroParagraphs((prev) => [...prev, ''])}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-[#5B1018] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Paragraph</span>
          </button>
        </div>

        {introParagraphs.length === 0 && (
          <p className="text-xs text-[#292321]/70">
            No overview paragraphs. Click &ldquo;Add Paragraph&rdquo; to add text.
          </p>
        )}

        {introParagraphs.map((para, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <textarea
              rows={3}
              value={para}
              onChange={(e) =>
                setIntroParagraphs((prev) =>
                  prev.map((row, i) => (i === idx ? e.target.value : row))
                )
              }
              placeholder="Write paragraph text..."
              className="flex-1 px-3 py-2 border border-[#B8B8B3] bg-white text-sm text-black focus:border-black focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setIntroParagraphs((prev) => prev.filter((_, i) => i !== idx))
              }
              className="p-2 border border-[#B8B8B3] bg-white text-[#5B1018] hover:border-[#5B1018]"
              aria-label="Remove paragraph"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Section B: About Us & Factory Media (Image or Video) */}
      <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
              2. About Us &amp; Factory Media ({photos.length})
            </h3>
            <p className="text-[11px] text-[#292321]/75">
              Upload either an Image or a Video for each media slot. Existing layout
              dimensions remain identical.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Media column position"
              value={placement}
              onChange={(e) =>
                setPlacement(e.target.value as 'left' | 'right')
              }
              className="px-3 py-1.5 border border-[#B8B8B3] bg-white text-xs text-black"
            >
              <option value="left">Media on Left Column</option>
              <option value="right">Media on Right Column</option>
            </select>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white text-xs font-semibold uppercase cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Preparing...' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || saving}
                onChange={(e) => handleStageImage(e)}
                className="sr-only"
              />
            </label>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5B1018] text-white text-xs font-semibold uppercase cursor-pointer hover:bg-[#430b11]">
              <Film className="w-3.5 h-3.5" />
              <span>Upload Video</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                disabled={uploading || saving}
                onChange={(e) => handleStageVideo(e)}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => setLibraryTarget('add-photo')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-black bg-white text-black text-xs font-semibold uppercase hover:bg-[#F5F5F5]"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="bg-white border border-dashed border-[#B8B8B3] p-6 text-center text-xs text-[#292321]/70">
            No media items currently selected. Upload an image or video, or choose from Image
            Library.
          </div>
        ) : (
          <div className="space-y-4">
            {photos.map((photo, idx) => {
              const staged = stagedFiles[photo.id];
              const isVideo =
                staged?.type === 'video' ||
                (staged?.type !== 'image' &&
                  photo.mediaType === 'video' &&
                  Boolean(photo.videoId));
              const resolvedImg =
                staged?.type === 'image'
                  ? staged.previewUrl
                  : resolveMediaSrc(photo.src);
              const xy = parsePositionXY(photo.position);

              return (
                <div
                  key={photo.id}
                  className={`bg-white border p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start ${
                    staged ? 'border-[#5B1018]' : 'border-[#B8B8B3]'
                  }`}
                >
                  <div className="md:col-span-5 aspect-[4/3] bg-[#F5F5F5] border border-[#B8B8B3]/60 overflow-hidden">
                    {isVideo ? (
                      <LoopingVideo
                        directSrc={
                          staged?.type === 'video' ? staged.previewUrl : undefined
                        }
                        videoId={
                          staged?.type !== 'video' ? photo.videoId : undefined
                        }
                        fallbackImgSrc={resolvedImg}
                        fallbackAlt={photo.alt || `Media ${idx + 1}`}
                        style={{
                          objectPosition: photo.position || '50% 50%',
                          objectFit: photo.fit || 'cover',
                        }}
                        className="w-full h-full"
                      />
                    ) : resolvedImg ? (
                      <img
                        src={resolvedImg}
                        alt={photo.alt || `Media ${idx + 1}`}
                        style={{
                          objectPosition: photo.position || '50% 50%',
                          objectFit: photo.fit || 'cover',
                        }}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#292321]/60">
                        Media Pending
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#5B1018]">
                        Slot #{idx + 1} ({isVideo ? 'VIDEO' : 'IMAGE'})
                        {staged ? ' · Preview Ready' : ''}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploading || saving}
                            onChange={(e) => handleStageImage(e, photo.id)}
                            className="sr-only"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1018] text-white text-[11px] font-semibold uppercase cursor-pointer hover:bg-[#430b11]">
                          <Film className="w-3 h-3" />
                          <span>Upload Video</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/*"
                            disabled={uploading || saving}
                            onChange={(e) => handleStageVideo(e, photo.id)}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setLibraryTarget(photo.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#B8B8B3] text-[11px] font-semibold uppercase hover:border-black"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Library</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (staged?.type === 'video') {
                              URL.revokeObjectURL(staged.previewUrl);
                            }
                            setStagedFiles((prev) => {
                              const copy = { ...prev };
                              delete copy[photo.id];
                              return copy;
                            });
                            setPhotos((prev) =>
                              prev.filter((item) => item.id !== photo.id)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#5B1018] text-[#5B1018] text-[11px] font-semibold uppercase hover:bg-[#F3E7DA]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="font-mono text-[#292321]/75">
                          Focus X: {xy.x}%
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={xy.x}
                          onChange={(e) => {
                            const nextPos = `${e.target.value}% ${xy.y}%`;
                            setPhotos((prev) =>
                              prev.map((p) =>
                                p.id === photo.id ? { ...p, position: nextPos } : p
                              )
                            );
                          }}
                          className="w-full accent-[#5B1018]"
                        />
                      </div>
                      <div>
                        <span className="font-mono text-[#292321]/75">
                          Focus Y: {xy.y}%
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={xy.y}
                          onChange={(e) => {
                            const nextPos = `${xy.x}% ${e.target.value}%`;
                            setPhotos((prev) =>
                              prev.map((p) =>
                                p.id === photo.id ? { ...p, position: nextPos } : p
                              )
                            );
                          }}
                          className="w-full accent-[#5B1018]"
                        />
                      </div>
                      <div>
                        <span className="font-semibold uppercase text-[#292321]/75">
                          Fit
                        </span>
                        <select
                          value={photo.fit || 'cover'}
                          onChange={(e) =>
                            setPhotos((prev) =>
                              prev.map((p) =>
                                p.id === photo.id
                                  ? { ...p, fit: e.target.value as 'cover' | 'contain' }
                                  : p
                              )
                            )
                          }
                          className="w-full px-2 py-1 border border-[#B8B8B3] bg-white text-xs mt-0.5"
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={photo.alt || ''}
                        onChange={(e) =>
                          setPhotos((prev) =>
                            prev.map((p) =>
                              p.id === photo.id ? { ...p, alt: e.target.value } : p
                            )
                          )
                        }
                        placeholder="Media description / alt text"
                        className="px-2.5 py-1.5 border border-[#B8B8B3] text-xs"
                      />
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) =>
                          setPhotos((prev) =>
                            prev.map((p) =>
                              p.id === photo.id
                                ? { ...p, caption: e.target.value }
                                : p
                            )
                          )
                        }
                        placeholder="Optional caption below media"
                        className="px-2.5 py-1.5 border border-[#B8B8B3] text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section C: Content Blocks */}
      <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
            3. About Us Content Blocks ({blocks.length})
          </h3>
          <button
            type="button"
            onClick={() =>
              setBlocks((prev) => [
                ...prev,
                {
                  id: `block-${Date.now()}`,
                  heading: '',
                  paragraphs: [''],
                },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-[#5B1018] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Content Block</span>
          </button>
        </div>

        {blocks.length === 0 && (
          <p className="text-xs text-[#292321]/70">
            All content blocks removed. Click &ldquo;Add Content Block&rdquo; to add one.
          </p>
        )}

        <div className="space-y-4">
          {blocks.map((block, bIdx) => (
            <div
              key={block.id}
              className="bg-white border border-[#B8B8B3] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#5B1018]">
                  Block #{bIdx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={bIdx === 0}
                    onClick={() => moveBlock(bIdx, -1)}
                    className="p-1 border border-[#B8B8B3] text-black disabled:opacity-35"
                    aria-label="Move block up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={bIdx === blocks.length - 1}
                    onClick={() => moveBlock(bIdx, 1)}
                    className="p-1 border border-[#B8B8B3] text-black disabled:opacity-35"
                    aria-label="Move block down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBlocks((prev) => prev.filter((_, i) => i !== bIdx))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#5B1018] text-[#5B1018] text-[11px] font-semibold uppercase hover:bg-[#F3E7DA]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Block</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#292321]/75 mb-1">
                  Block Heading
                </label>
                <input
                  type="text"
                  value={block.heading}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((row, i) =>
                        i === bIdx ? { ...row, heading: e.target.value } : row
                      )
                    )
                  }
                  placeholder="Enter heading..."
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm font-semibold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#292321]/75">
                    Paragraphs ({block.paragraphs.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.map((row, i) =>
                          i === bIdx
                            ? { ...row, paragraphs: [...row.paragraphs, ''] }
                            : row
                        )
                      )
                    }
                    className="text-[11px] font-semibold uppercase text-[#5B1018] hover:underline"
                  >
                    + Add Paragraph
                  </button>
                </div>

                {block.paragraphs.map((para, pIdx) => (
                  <div key={pIdx} className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      value={para}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((row, i) =>
                            i === bIdx
                              ? {
                                  ...row,
                                  paragraphs: row.paragraphs.map((p, pi) =>
                                    pi === pIdx ? e.target.value : p
                                  ),
                                }
                              : row
                          )
                        )
                      }
                      placeholder="Enter paragraph..."
                      className="flex-1 px-3 py-2 border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBlocks((prev) =>
                          prev.map((row, i) =>
                            i === bIdx
                              ? {
                                  ...row,
                                  paragraphs: row.paragraphs.filter(
                                    (_, pi) => pi !== pIdx
                                  ),
                                }
                              : row
                          )
                        )
                      }
                      className="p-2 border border-[#B8B8B3] text-[#5B1018] hover:border-[#5B1018]"
                      aria-label="Remove paragraph"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPreview && (
        <div className="border border-black bg-[#F5F5F5] p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
            About Us Preview
          </p>
          {introParagraphs.filter(Boolean).map((p, i) => (
            <p key={i} className="text-sm text-[#292321]/85 leading-relaxed">
              {p}
            </p>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#B8B8B3]/60">
            {blocks.map((b) => (
              <div key={b.id} className="bg-white border border-[#B8B8B3]/70 p-3">
                <p className="font-display text-base font-semibold text-black">
                  {b.heading}
                </p>
                {b.paragraphs.map((p, pi) => (
                  <p key={pi} className="text-xs text-[#292321]/80 mt-1">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadStatusText && (
        <div className="p-3 bg-[#F5F5F5] border border-black text-xs font-mono text-black">
          {uploadStatusText}
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018]">
          {errorMessage}
        </div>
      )}

      <div className="pt-3 border-t border-[#B8B8B3]/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleCancel}
            className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
          >
            CANCEL
          </button>
          {previewMode && (
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await discardDraft();
                  setStatusMessage('Discarded draft preview.');
                } finally {
                  setSaving(false);
                }
              }}
              className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-[#5B1018]"
            >
              Discard Draft
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSaveAction('preview')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PREVIEW</span>
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSaveAction('save-draft')}
            className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSaveAction('publish')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>PUBLISH / UPDATE WEBSITE</span>
          </button>
        </div>
      </div>

      <ImageLibraryModal
        open={libraryTarget !== null}
        initialUsage="about"
        onSelectImage={(refUrl, alt) => {
          if (libraryTarget === 'add-photo') {
            setPhotos((prev) => [
              ...prev,
              {
                id: `photo-${Date.now()}`,
                src: refUrl,
                alt: alt || 'SHREE DURGA STEELS photograph',
                caption: '',
                position: '50% 50%',
                fit: 'cover',
                mediaType: 'image',
              },
            ]);
          } else if (libraryTarget) {
            const st = stagedFiles[libraryTarget];
            if (st?.type === 'video') URL.revokeObjectURL(st.previewUrl);
            setStagedFiles((prev) => {
              const copy = { ...prev };
              delete copy[libraryTarget];
              return copy;
            });
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === libraryTarget
                  ? {
                      ...p,
                      src: refUrl,
                      mediaType: 'image',
                      videoId: '',
                      ...(alt && !p.alt ? { alt } : {}),
                    }
                  : p
              )
            );
          }
          setStatusMessage(
            'Image selected from Image Library. Click SAVE CHANGES or PUBLISH / UPDATE WEBSITE.'
          );
        }}
        onClose={() => setLibraryTarget(null)}
      />
    </div>
  );
}
