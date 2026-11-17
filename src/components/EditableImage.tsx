import { useEffect, useState } from 'react';
import {
  Eye,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ImageSlotValue, MediaFormat, MediaUsage } from '../types/catalog';
import { compressImagePreserveRatio, uploadImageAssetToFirestore } from '../lib/mediaUtils';
import {
  formatVideoFileSize,
  uploadVideoAssetToFirestore,
  validateVideoFile,
} from '../lib/videoStorage';
import { useStore, type SaveActionMode } from '../context/StoreContext';
import { ImageLibraryModal } from './ImageLibraryModal';
import { LoopingVideo } from './LoopingVideo';

interface EditableImageProps {
  slotId: string;
  defaultSrc: string;
  defaultAlt: string;
  usage: MediaUsage;
  label?: string;
  className?: string;
  containerClassName?: string;
  defaultFit?: 'cover' | 'contain';
  previewAspectClass?: string;
  isLogo?: boolean;
  allowVideo?: boolean;
}

const POSITION_PRESETS = [
  { label: 'Center', value: '50% 50%', x: 50, y: 50 },
  { label: 'Top', value: '50% 15%', x: 50, y: 15 },
  { label: 'Bottom', value: '50% 85%', x: 50, y: 85 },
  { label: 'Left', value: '15% 50%', x: 15, y: 50 },
  { label: 'Right', value: '85% 50%', x: 85, y: 50 },
];

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

export function EditableImage({
  slotId,
  defaultSrc,
  defaultAlt,
  usage,
  label,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  defaultFit = 'cover',
  previewAspectClass = 'aspect-[16/10]',
  isLogo = false,
  allowVideo = !isLogo,
}: EditableImageProps) {
  const {
    isAdmin,
    editMode,
    activeContent,
    publishedContent,
    draftContent,
    previewMode,
    resolveMediaSrc,
    getImageSlot,
    saveSiteContent,
  } = useStore();

  const slot = getImageSlot(slotId, defaultSrc, defaultAlt, defaultFit);
  const resolvedSrc = !slot.deleted ? resolveMediaSrc(slot.src) : undefined;
  const isSlotVideo = allowVideo && slot.mediaType === 'video' && Boolean(slot.videoId);

  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [draftMediaType, setDraftMediaType] = useState<MediaFormat>(slot.mediaType);
  const [draftSrc, setDraftSrc] = useState('');
  const [draftVideoId, setDraftVideoId] = useState('');
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedImagePreview, setStagedImagePreview] = useState('');
  const [stagedVideoFile, setStagedVideoFile] = useState<File | null>(null);
  const [stagedVideoPreview, setStagedVideoPreview] = useState('');

  const [draftAlt, setDraftAlt] = useState('');
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [draftFit, setDraftFit] = useState<'cover' | 'contain'>(defaultFit);
  const [draftDeleted, setDraftDeleted] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (stagedVideoPreview) URL.revokeObjectURL(stagedVideoPreview);
    };
  }, [stagedVideoPreview]);

  const clearStagedFiles = () => {
    if (stagedVideoPreview) URL.revokeObjectURL(stagedVideoPreview);
    setStagedImageFile(null);
    setStagedImagePreview('');
    setStagedVideoFile(null);
    setStagedVideoPreview('');
  };

  const openEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearStagedFiles();
    const adminOv = (draftContent || publishedContent).imageOverrides?.[slotId];
    const initType: MediaFormat =
      allowVideo && adminOv?.mediaType === 'video' && adminOv?.videoId
        ? 'video'
        : slot.mediaType;
    const initSrc = adminOv?.src !== undefined ? adminOv.src : slot.src;
    const initVideoId = adminOv?.videoId !== undefined ? adminOv.videoId : slot.videoId;
    const initAlt = adminOv?.alt !== undefined ? adminOv.alt : slot.alt;
    const initPos = adminOv?.position || slot.position;
    const initFit = adminOv?.fit || slot.fit;
    const initDel = adminOv?.deleted !== undefined ? Boolean(adminOv.deleted) : slot.deleted;

    setDraftMediaType(initType);
    setDraftSrc(initSrc);
    setDraftVideoId(initVideoId);
    setDraftAlt(initAlt);
    const parsed = parsePositionXY(initPos);
    setPosX(parsed.x);
    setPosY(parsed.y);
    setDraftFit(initFit);
    setDraftDeleted(initDel);
    setStatusMessage(null);
    setErrorMessage(null);
    setShowPreviewPane(true);
    setOpen(true);
  };

  const handleStageNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const processed = await compressImagePreserveRatio(file);
      if (stagedVideoPreview) URL.revokeObjectURL(stagedVideoPreview);
      setStagedVideoFile(null);
      setStagedVideoPreview('');
      setStagedImageFile(file);
      setStagedImagePreview(processed.dataUrl);
      setDraftMediaType('image');
      setDraftDeleted(false);
      setShowPreviewPane(true);
      setStatusMessage(
        'Image preview ready. Click SAVE CHANGES to store permanently or PUBLISH / UPDATE WEBSITE to apply live.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to prepare image preview.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleStageNewVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      validateVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      if (stagedVideoPreview) URL.revokeObjectURL(stagedVideoPreview);
      setStagedImageFile(null);
      setStagedImagePreview('');
      setStagedVideoFile(file);
      setStagedVideoPreview(previewUrl);
      setDraftMediaType('video');
      setDraftDeleted(false);
      setShowPreviewPane(true);
      setStatusMessage(
        `Video preview ready (${file.name} · ${formatVideoFileSize(file.size)}). Click SAVE CHANGES to store permanently or PUBLISH / UPDATE WEBSITE to apply live.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to prepare video preview.'
      );
    }
  };

  const handleCancelChanges = () => {
    clearStagedFiles();
    setOpen(false);
  };

  const handleSaveAction = async (mode: SaveActionMode) => {
    setSaving(true);
    setUploadPct(0);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let finalMediaType: MediaFormat = draftMediaType;
      let finalSrc = draftSrc;
      let finalVideoId = draftVideoId;

      if (stagedImageFile) {
        const res = await uploadImageAssetToFirestore({
          file: stagedImageFile,
          usage,
          name: label || stagedImageFile.name,
          altText: draftAlt || defaultAlt,
        });
        finalMediaType = 'image';
        finalSrc = res.refUrl;
        finalVideoId = '';
        setDraftSrc(res.refUrl);
        setDraftVideoId('');
      } else if (stagedVideoFile) {
        const uploadedVid = await uploadVideoAssetToFirestore({
          file: stagedVideoFile,
          variant: 'section',
          name: `${label || slotId} Video (${stagedVideoFile.name})`,
          onProgress: (pct) => setUploadPct(pct),
        });
        finalMediaType = 'video';
        finalVideoId = uploadedVid.id;
        setDraftVideoId(uploadedVid.id);
      }

      if (finalMediaType === 'image') {
        finalVideoId = '';
      }

      const base =
        mode === 'save-draft'
          ? draftContent || publishedContent
          : previewMode && draftContent
          ? draftContent
          : activeContent || publishedContent;

      const slotValue: ImageSlotValue = {
        src: finalSrc,
        alt: draftAlt,
        position: `${posX}% ${posY}%`,
        fit: draftFit,
        deleted: draftDeleted,
        mediaType: finalMediaType,
        videoId: finalVideoId,
      };

      const nextContent = {
        ...base,
        imageOverrides: {
          ...(base.imageOverrides || {}),
          [slotId]: slotValue,
        },
        ...(isLogo
          ? {
              logoUrl: draftDeleted ? '' : finalSrc,
              logoAlt: draftAlt,
              logoPosition: `${posX}% ${posY}%`,
              logoDeleted: draftDeleted,
            }
          : {}),
      };

      await saveSiteContent(nextContent, mode);
      clearStagedFiles();

      if (mode === 'save-draft') {
        setStatusMessage(
          'Media changes saved permanently. Click PUBLISH / UPDATE WEBSITE when ready to update the live site.'
        );
      } else if (mode === 'preview') {
        setStatusMessage(
          'Draft preview saved permanently. Click PUBLISH / UPDATE WEBSITE when ready.'
        );
      } else {
        setStatusMessage(
          'Published! Updated media is now live on the website.'
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not save media changes to Firestore.'
      );
    } finally {
      setSaving(false);
      setUploadPct(0);
    }
  };

  const previewImgSrc = !draftDeleted
    ? stagedImagePreview || resolveMediaSrc(draftSrc)
    : undefined;
  const computedObjectPosition = `${posX}% ${posY}%`;

  const renderMediaElement = () => {
    if (slot.deleted) {
      if (!isAdmin || !editMode) return null;
      return (
        <div className="w-full h-full min-h-[48px] bg-[#F5F5F5] border border-dashed border-[#B8B8B3] flex items-center justify-center p-2 text-center">
          <span className="text-[11px] font-mono text-[#292321]/70">
            [Media Removed — Click to Upload Image or Video]
          </span>
        </div>
      );
    }

    if (isSlotVideo) {
      return (
        <LoopingVideo
          videoId={slot.videoId}
          fallbackImgSrc={resolvedSrc}
          fallbackAlt={slot.alt || defaultAlt}
          style={{
            objectPosition: slot.position,
            objectFit: slot.fit,
          }}
          className={className}
        />
      );
    }

    if (!resolvedSrc) {
      if (!isAdmin || !editMode) return null;
      return (
        <div className="w-full h-full min-h-[48px] bg-[#F5F5F5] border border-dashed border-[#B8B8B3] flex items-center justify-center p-2 text-center">
          <span className="text-[11px] font-mono text-[#292321]/70">
            [Media Pending — Click to Upload]
          </span>
        </div>
      );
    }

    return (
      <img
        src={resolvedSrc}
        alt={slot.alt || defaultAlt}
        referrerPolicy="no-referrer"
        style={{
          objectPosition: slot.position,
          objectFit: slot.fit,
        }}
        className={className}
      />
    );
  };

  if (!isAdmin || !editMode) {
    if (containerClassName) {
      return <div className={containerClassName}>{renderMediaElement()}</div>;
    }
    return <>{renderMediaElement()}</>;
  }

  return (
    <>
      <div
        onClick={openEditor}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            openEditor(e as unknown as React.MouseEvent);
          }
        }}
        className={`relative group cursor-pointer outline-2 outline-dashed outline-[#5B1018]/75 ${
          containerClassName || 'w-full h-full'
        }`}
      >
        {renderMediaElement()}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-1.5 bg-black/90 text-white border border-[#D8BFA8] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xl">
            <ImageIcon className="w-4 h-4 text-[#D8BFA8]" />
            <span>Click to Change Image</span>
          </span>
        </div>
        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.06em] shadow-md border border-white/20">
          {isSlotVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
          <span>{allowVideo ? 'Edit Media' : 'Change Image'}</span>
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white border border-black max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-[#B8B8B3]/60 px-6 pt-5 pb-3 shrink-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                  Section Media Manager ({draftMediaType === 'video' ? 'Video Active' : 'Image Active'})
                </p>
                <h3 className="font-display text-lg font-semibold text-black">
                  {label || slotId}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelChanges}
                className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
                aria-label="Close media editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">

            {/* Two Clear Upload Options: Upload Image OR Upload Video */}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-[#292321]">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Preparing...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading || saving}
                  onChange={handleStageNewImage}
                  className="sr-only"
                />
              </label>

              {allowVideo && (
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-[#430b11]">
                  <Film className="w-3.5 h-3.5" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    disabled={uploading || saving}
                    onChange={handleStageNewVideo}
                    className="sr-only"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-black bg-white text-black text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#F5F5F5]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Image Library</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewPane((p) => !p)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#B8B8B3] bg-[#F5F5F5] text-black text-xs font-semibold uppercase tracking-[0.06em] hover:border-black"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreviewPane ? 'Hide Preview' : 'Preview'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearStagedFiles();
                  setDraftDeleted(true);
                  setStatusMessage(
                    'Media marked for removal. Click SAVE CHANGES or PUBLISH / UPDATE WEBSITE.'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#5B1018] bg-white text-[#5B1018] text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#F3E7DA]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>

            {/* Live Container Preview */}
            {showPreviewPane && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]/70">
                  {stagedImageFile || stagedVideoFile
                    ? 'Preview Before Saving (Exact Container Dimensions)'
                    : 'Active Section Media Preview'}
                </p>
                <div
                  className={`border border-[#B8B8B3] bg-[#F5F5F5] overflow-hidden max-h-72 ${previewAspectClass}`}
                >
                  {draftDeleted ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-xs text-[#292321]/70 gap-2">
                      <span>Media removed</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftMediaType('image');
                          setDraftSrc(defaultSrc);
                          setDraftVideoId('');
                          setDraftDeleted(false);
                        }}
                        className="underline text-[#5B1018] font-semibold"
                      >
                        Restore Default Image
                      </button>
                    </div>
                  ) : draftMediaType === 'video' && (stagedVideoPreview || draftVideoId) ? (
                    <LoopingVideo
                      directSrc={stagedVideoPreview || undefined}
                      videoId={!stagedVideoPreview ? draftVideoId : undefined}
                      fallbackImgSrc={previewImgSrc}
                      fallbackAlt={draftAlt || defaultAlt}
                      style={{
                        objectPosition: computedObjectPosition,
                        objectFit: draftFit,
                      }}
                      className="w-full h-full"
                    />
                  ) : previewImgSrc ? (
                    <img
                      src={previewImgSrc}
                      alt={draftAlt || defaultAlt}
                      style={{
                        objectPosition: computedObjectPosition,
                        objectFit: draftFit,
                      }}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6 text-xs text-[#292321]/70">
                      No media currently set
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Adjust Position & Fit */}
            <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
                  Adjust Position &amp; Fit
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POSITION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setPosX(preset.x);
                        setPosY(preset.y);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium border ${
                        posX === preset.x && posY === preset.y
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[11px] font-mono text-[#292321]/80 mb-1">
                    Horizontal Focus (X: {posX}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full accent-[#5B1018]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#292321]/80 mb-1">
                    Vertical Focus (Y: {posY}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full accent-[#5B1018]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#292321]/80 mb-1">
                    Media Fit
                  </label>
                  <select
                    value={draftFit}
                    onChange={(e) =>
                      setDraftFit(e.target.value as 'cover' | 'contain')
                    }
                    className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs text-black"
                  >
                    <option value="cover">Fill Container (Cover)</option>
                    <option value="contain">Show Full Media (Contain)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#292321]/80 mb-1">
                  Description / Alt Text
                </label>
                <input
                  type="text"
                  value={draftAlt}
                  onChange={(e) => setDraftAlt(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#B8B8B3] bg-white text-xs text-black"
                />
              </div>
            </div>

            {saving && uploadPct > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>Uploading video to permanent storage...</span>
                  <span>{uploadPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F5F5F5] border border-[#B8B8B3]">
                  <div
                    className="h-full bg-[#5B1018]"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              </div>
            )}

            {statusMessage && (
              <div className="p-3 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black">
                {statusMessage}
              </div>
            )}

              {errorMessage && (
                <div className="p-3 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018]">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#B8B8B3]/60 bg-white shrink-0 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleCancelChanges}
                className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
              >
                CANCEL
              </button>

              <div className="flex flex-wrap gap-2">
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
                  className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
                >
                  PUBLISH / UPDATE WEBSITE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageLibraryModal
        open={libraryOpen}
        initialUsage={usage}
        onSelectImage={(refUrl, alt) => {
          clearStagedFiles();
          setDraftMediaType('image');
          setDraftSrc(refUrl);
          setDraftVideoId('');
          if (alt && !draftAlt) setDraftAlt(alt);
          setDraftDeleted(false);
          setStatusMessage(
            'Image selected from library. Click SAVE CHANGES or PUBLISH / UPDATE WEBSITE.'
          );
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  );
}
