import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Film,
  FolderOpen,
  Image as ImageIcon,
  MessageCircle,
  Monitor,
  RotateCcw,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { compressImagePreserveRatio, uploadImageAssetToFirestore } from '../lib/mediaUtils';
import {
  formatVideoFileSize,
  MAX_HERO_VIDEO_BYTES,
  resolveVideoBlobUrl,
  uploadVideoAssetToFirestore,
  validateVideoFile,
} from '../lib/videoStorage';
import type { MediaFormat } from '../types/catalog';
import { ImageLibraryModal } from './ImageLibraryModal';

const DEFAULT_HERO_IMAGE =
  '/images/hero_stainless_manufacturing_1794728248058.jpg';

export function HeroVideoManager() {
  const {
    adminContent,
    publishedContent,
    draftContent,
    videoAssets,
    resolveMediaSrc,
    saveSiteContent,
  } = useStore();

  const savedMode: MediaFormat =
    adminContent.heroMediaType ||
    (adminContent.heroVideoId ? 'video' : 'image');

  const savedHeroImgSlot = adminContent.imageOverrides?.['home.hero.image'];
  const savedHeroImgSrc = savedHeroImgSlot?.src || DEFAULT_HERO_IMAGE;

  const [selectedMode, setSelectedMode] = useState<MediaFormat>(savedMode);

  // Staged local previews (not saved yet)
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedImagePreview, setStagedImagePreview] = useState<string>('');
  const [stagedImageRef, setStagedImageRef] = useState<string>(''); // e.g., chosen from library
  const [stagedDesktopFile, setStagedDesktopFile] = useState<File | null>(null);
  const [stagedDesktopUrl, setStagedDesktopUrl] = useState<string>('');
  const [stagedMobileFile, setStagedMobileFile] = useState<File | null>(null);
  const [stagedMobileUrl, setStagedMobileUrl] = useState<string>('');

  const [liveDesktopUrl, setLiveDesktopUrl] = useState<string | null>(null);
  const [liveMobileUrl, setLiveMobileUrl] = useState<string | null>(null);

  const [overlayOpacity, setOverlayOpacity] = useState<number>(
    typeof adminContent.heroOverlayOpacity === 'number'
      ? adminContent.heroOverlayOpacity
      : 0.5
  );

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreviewFrame, setShowPreviewFrame] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageLabel, setUploadStageLabel] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync from saved Firestore draft/published when loaded after refresh
  useEffect(() => {
    setSelectedMode(savedMode);
    setOverlayOpacity(
      typeof adminContent.heroOverlayOpacity === 'number'
        ? adminContent.heroOverlayOpacity
        : 0.5
    );
  }, [savedMode, adminContent.heroOverlayOpacity]);

  useEffect(() => {
    let cancelled = false;
    if (!adminContent.heroVideoId) {
      setLiveDesktopUrl(null);
      return;
    }
    resolveVideoBlobUrl(adminContent.heroVideoId).then((url) => {
      if (!cancelled) setLiveDesktopUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [adminContent.heroVideoId]);

  useEffect(() => {
    let cancelled = false;
    if (!adminContent.heroMobileVideoId) {
      setLiveMobileUrl(null);
      return;
    }
    resolveVideoBlobUrl(adminContent.heroMobileVideoId).then((url) => {
      if (!cancelled) setLiveMobileUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [adminContent.heroMobileVideoId]);

  useEffect(() => {
    return () => {
      if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
    };
  }, [stagedDesktopUrl]);

  useEffect(() => {
    return () => {
      if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
    };
  }, [stagedMobileUrl]);

  const assetById = useMemo(() => {
    const map: Record<string, (typeof videoAssets)[number]> = {};
    for (const v of videoAssets) {
      map[v.id] = v;
    }
    return map;
  }, [videoAssets]);

  const currentDesktopAsset = adminContent.heroVideoId
    ? assetById[adminContent.heroVideoId]
    : undefined;
  const previousDesktopAsset = adminContent.heroPreviousVideoId
    ? assetById[adminContent.heroPreviousVideoId]
    : undefined;
  const currentMobileAsset = adminContent.heroMobileVideoId
    ? assetById[adminContent.heroMobileVideoId]
    : undefined;

  const handleSelectImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setNotice(null);

    try {
      const processed = await compressImagePreserveRatio(file);
      if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
      if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
      setStagedDesktopFile(null);
      setStagedDesktopUrl('');
      setStagedMobileFile(null);
      setStagedMobileUrl('');

      setStagedImageFile(file);
      setStagedImagePreview(processed.dataUrl);
      setStagedImageRef('');
      setSelectedMode('image');
      setShowPreviewFrame(true);
      setNotice(
        `Hero Image preview ready (${file.name}). Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE to apply live.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not prepare image preview.'
      );
    }
  };

  const handleSelectVideoFile = (
    variant: 'desktop' | 'mobile',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setNotice(null);

    try {
      validateVideoFile(file);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid video file.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedImageFile(null);
    setStagedImagePreview('');
    setStagedImageRef('');
    setSelectedMode('video');

    if (variant === 'desktop') {
      if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
      setStagedDesktopFile(file);
      setStagedDesktopUrl(previewUrl);
      setPreviewViewport('desktop');
    } else {
      if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
      setStagedMobileFile(file);
      setStagedMobileUrl(previewUrl);
      setPreviewViewport('mobile');
    }

    setShowPreviewFrame(true);
    setNotice(
      `Hero Video preview ready (${file.name} · ${formatVideoFileSize(file.size)}). Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE to apply live.`
    );
  };

  const clearStagedLocalChanges = () => {
    if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
    if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
    setStagedImageFile(null);
    setStagedImagePreview('');
    setStagedImageRef('');
    setStagedDesktopFile(null);
    setStagedDesktopUrl('');
    setStagedMobileFile(null);
    setStagedMobileUrl('');
    setSelectedMode(savedMode);
    setOverlayOpacity(
      typeof adminContent.heroOverlayOpacity === 'number'
        ? adminContent.heroOverlayOpacity
        : 0.5
    );
    setErrorMsg(null);
    setNotice('Cancelled unsaved hero media changes.');
  };

  const hasStagedLocal =
    Boolean(stagedImageFile) ||
    Boolean(stagedImageRef) ||
    Boolean(stagedDesktopFile) ||
    Boolean(stagedMobileFile) ||
    selectedMode !== savedMode ||
    Math.abs(
      overlayOpacity -
        (typeof adminContent.heroOverlayOpacity === 'number'
          ? adminContent.heroOverlayOpacity
          : 0.5)
    ) > 0.005;

  const hasUnpublishedDraftHero = Boolean(
    draftContent &&
      (draftContent.heroMediaType !== publishedContent.heroMediaType ||
        draftContent.heroVideoId !== publishedContent.heroVideoId ||
        draftContent.heroMobileVideoId !== publishedContent.heroMobileVideoId ||
        draftContent.heroOverlayOpacity !== publishedContent.heroOverlayOpacity ||
        draftContent.imageOverrides?.['home.hero.image']?.src !==
          publishedContent.imageOverrides?.['home.hero.image']?.src)
  );

  const persistHeroChanges = async (mode: 'save-draft' | 'publish') => {
    setSaving(true);
    setErrorMsg(null);
    setNotice(null);
    setUploadProgress(0);

    try {
      let nextHeroVideoId = adminContent.heroVideoId || '';
      let nextPrevVideoId = adminContent.heroPreviousVideoId || '';
      let nextMobileVideoId = adminContent.heroMobileVideoId || '';
      let nextPrevMobileVideoId = adminContent.heroPreviousMobileVideoId || '';
      const nextImgOverrides = { ...(adminContent.imageOverrides || {}) };
      let nextHeroMediaType: MediaFormat = selectedMode;

      if (stagedImageFile) {
        setUploadStageLabel('Saving Hero Image permanently...');
        setUploadProgress(35);
        const uploadedImg = await uploadImageAssetToFirestore({
          file: stagedImageFile,
          usage: 'homepage',
          name: `Homepage Hero Image (${stagedImageFile.name})`,
        });
        nextImgOverrides['home.hero.image'] = {
          ...(nextImgOverrides['home.hero.image'] || {}),
          src: uploadedImg.refUrl,
          alt:
            nextImgOverrides['home.hero.image']?.alt ||
            'SHREE DURGA STEELS stainless steel products',
          fit: 'cover',
          deleted: false,
          mediaType: 'image',
        };
        nextHeroMediaType = 'image';
        setUploadProgress(90);
      } else if (stagedImageRef) {
        nextImgOverrides['home.hero.image'] = {
          ...(nextImgOverrides['home.hero.image'] || {}),
          src: stagedImageRef,
          alt:
            nextImgOverrides['home.hero.image']?.alt ||
            'SHREE DURGA STEELS stainless steel products',
          fit: 'cover',
          deleted: false,
          mediaType: 'image',
        };
        nextHeroMediaType = 'image';
      }

      if (stagedDesktopFile) {
        setUploadStageLabel('Saving Desktop Hero Video permanently...');
        const uploadedDesktop = await uploadVideoAssetToFirestore({
          file: stagedDesktopFile,
          variant: 'desktop',
          name: stagedDesktopFile.name,
          onProgress: (pct) => setUploadProgress(pct),
        });
        if (nextHeroVideoId && nextHeroVideoId !== uploadedDesktop.id) {
          nextPrevVideoId = nextHeroVideoId;
        }
        nextHeroVideoId = uploadedDesktop.id;
        nextHeroMediaType = 'video';
      }

      if (stagedMobileFile) {
        setUploadStageLabel('Saving Mobile Hero Video permanently...');
        const uploadedMobile = await uploadVideoAssetToFirestore({
          file: stagedMobileFile,
          variant: 'mobile',
          name: stagedMobileFile.name,
          onProgress: (pct) => setUploadProgress(pct),
        });
        if (nextMobileVideoId && nextMobileVideoId !== uploadedMobile.id) {
          nextPrevMobileVideoId = nextMobileVideoId;
        }
        nextMobileVideoId = uploadedMobile.id;
        nextHeroMediaType = 'video';
      }

      // If switching to video mode when only mobile or desktop exists, ensure a video exists
      if (nextHeroMediaType === 'video' && !nextHeroVideoId) {
        throw new Error('Please upload a Hero Video before switching the Hero section to Video.');
      }

      // Keep only one active format on live/draft hero, while remembering previous video for restore
      if (nextHeroMediaType === 'image' && nextHeroVideoId) {
        nextPrevVideoId = nextHeroVideoId;
      }

      setUploadStageLabel(
        mode === 'save-draft' ? 'Saving Changes...' : 'Publishing to Live Website...'
      );
      await saveSiteContent(
        {
          ...adminContent,
          imageOverrides: nextImgOverrides,
          heroMediaType: nextHeroMediaType,
          heroVideoId: nextHeroMediaType === 'video' ? nextHeroVideoId : '',
          heroPreviousVideoId: nextPrevVideoId,
          heroMobileVideoId: nextHeroMediaType === 'video' ? nextMobileVideoId : '',
          heroPreviousMobileVideoId: nextPrevMobileVideoId,
          heroOverlayOpacity: Number(overlayOpacity.toFixed(2)),
        },
        mode
      );

      if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
      if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
      setStagedImageFile(null);
      setStagedImagePreview('');
      setStagedImageRef('');
      setStagedDesktopFile(null);
      setStagedDesktopUrl('');
      setStagedMobileFile(null);
      setStagedMobileUrl('');

      setNotice(
        mode === 'save-draft'
          ? 'Homepage Hero changes saved permanently. Click PUBLISH / UPDATE WEBSITE to apply them to the live website.'
          : 'Homepage Hero updated and published permanently to the live website.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not save homepage hero media. Please verify admin permissions.'
      );
    } finally {
      setSaving(false);
      setUploadProgress(0);
      setUploadStageLabel('');
    }
  };

  const handleRestorePreviousVideo = async () => {
    const prevId = adminContent.heroPreviousVideoId;
    if (!prevId) return;
    setSaving(true);
    setErrorMsg(null);
    setNotice(null);

    try {
      const currId = adminContent.heroVideoId || '';
      await saveSiteContent(
        {
          ...adminContent,
          heroMediaType: 'video',
          heroVideoId: prevId,
          heroPreviousVideoId: currId && currId !== prevId ? currId : '',
        },
        'save-draft'
      );
      setSelectedMode('video');
      setNotice(
        'Restored previous Hero Video into saved changes. Click PUBLISH / UPDATE WEBSITE to make it live.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not restore previous video.'
      );
    } finally {
      setSaving(false);
    }
  };

  const resolvedSavedHeroImg =
    resolveMediaSrc(stagedImageRef || savedHeroImgSrc) || DEFAULT_HERO_IMAGE;
  const activePreviewImg = stagedImagePreview || resolvedSavedHeroImg;

  const effectivePreviewVideoSrc =
    previewViewport === 'mobile'
      ? stagedMobileUrl || liveMobileUrl || stagedDesktopUrl || liveDesktopUrl || ''
      : stagedDesktopUrl || liveDesktopUrl || '';

  const showVideoInPreview =
    selectedMode === 'video' && Boolean(effectivePreviewVideoSrc);

  return (
    <div className="border border-[#B8B8B3]/80 bg-white p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#B8B8B3]/50 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
            Homepage Section 1 · Hero Media (Image or Video)
          </p>
          <h2 className="font-display text-lg font-semibold text-black mt-0.5">
            Homepage Hero Background — Image or Video
          </h2>
          <p className="text-xs text-[#292321]/75 mt-1 max-w-2xl">
            Upload either an Image or a Video for the Homepage Hero section. Only one format
            is active at a time, inside the same full-width Hero layout.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreviewFrame((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5] shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showPreviewFrame ? 'Hide Preview' : 'Show Preview'}</span>
        </button>
      </div>

      {hasUnpublishedDraftHero && !hasStagedLocal && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black flex flex-wrap items-center justify-between gap-3">
          <span>
            You have saved Hero media changes waiting to go live. Click{' '}
            <strong>PUBLISH / UPDATE WEBSITE</strong> to apply them to the live site.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018]">
          {errorMsg}
        </div>
      )}

      {notice && (
        <div className="p-3.5 bg-[#F5F5F5] border border-black text-xs font-medium text-black">
          {notice}
        </div>
      )}

      {/* Current Active Media Summary + Two Upload Choices */}
      <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#B8B8B3]/70 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            {selectedMode === 'video' ? (
              <Film className="w-4 h-4 text-[#5B1018] shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-[#5B1018] shrink-0" />
            )}
            <div>
              <p className="font-semibold text-black">
                Currently Active Format:{' '}
                <span className="uppercase text-[#5B1018]">
                  {selectedMode === 'video' ? 'Video' : 'Image'}
                </span>
              </p>
              <p className="text-[11px] text-[#292321]/75 mt-0.5">
                {selectedMode === 'video'
                  ? stagedDesktopFile
                    ? `Staged Video: ${stagedDesktopFile.name} (${formatVideoFileSize(stagedDesktopFile.size)})`
                    : currentDesktopAsset
                    ? `Saved Video: ${currentDesktopAsset.name} (${formatVideoFileSize(currentDesktopAsset.sizeBytes)})`
                    : 'Hero video active'
                  : stagedImageFile
                  ? `Staged Image: ${stagedImageFile.name}`
                  : stagedImageRef
                  ? 'Selected Image from Library (unsaved)'
                  : 'Hero Image active'}
              </p>
            </div>
          </div>

          {adminContent.heroPreviousVideoId && (
            <button
              type="button"
              disabled={saving}
              onClick={handleRestorePreviousVideo}
              title={
                previousDesktopAsset
                  ? `Restore ${previousDesktopAsset.name}`
                  : 'Restore previous video'
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-[11px] font-semibold uppercase text-black hover:bg-[#F5F5F5] disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Previous Video</span>
            </button>
          )}
        </div>

        {/* Upload Image OR Upload Video */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-[#292321]">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              disabled={saving}
              onChange={handleSelectImageFile}
              className="sr-only"
            />
          </label>

          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-[#430b11]">
            <Film className="w-3.5 h-3.5" />
            <span>Upload Video</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              disabled={saving}
              onChange={(e) => handleSelectVideoFile('desktop', e)}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => setLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-black text-xs font-semibold uppercase tracking-[0.06em] hover:bg-white/70"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Choose Image from Library</span>
          </button>

          {selectedMode === 'video' && (
            <label className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-black text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-white/70">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {currentMobileAsset || stagedMobileFile
                  ? 'Replace Mobile Video (Optional)'
                  : 'Upload Mobile Video (Optional)'}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                disabled={saving}
                onChange={(e) => handleSelectVideoFile('mobile', e)}
                className="sr-only"
              />
            </label>
          )}
        </div>

        <p className="text-[11px] text-[#292321]/70">
          Videos support MP4, WebM, or MOV up to {formatVideoFileSize(MAX_HERO_VIDEO_BYTES)} and
          autoplay muted in a loop across desktop, tablet, and mobile.
        </p>
      </div>

      {/* Subtle Dark Overlay Control & Cancel / Save Changes / Publish */}
      <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.05em] text-black">
            <span>Subtle Dark Overlay Effect</span>
            <span className="font-mono text-[#5B1018]">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.25}
            max={0.75}
            step={0.05}
            value={overlayOpacity}
            disabled={saving}
            onChange={(e) => {
              setOverlayOpacity(parseFloat(e.target.value));
              setShowPreviewFrame(true);
            }}
            className="w-full accent-[#5B1018]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasStagedLocal && (
            <button
              type="button"
              disabled={saving}
              onClick={clearStagedLocalChanges}
              className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
            >
              CANCEL
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => persistHeroChanges('save-draft')}
            className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-50"
          >
            {saving && uploadStageLabel.includes('Saving')
              ? `SAVING... ${uploadProgress}%`
              : 'SAVE CHANGES'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => persistHeroChanges('publish')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {saving && uploadStageLabel.includes('Publishing')
                ? `PUBLISHING... ${uploadProgress}%`
                : 'PUBLISH / UPDATE WEBSITE'}
            </span>
          </button>
        </div>
      </div>

      {saving && uploadStageLabel && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-black">
            <span>{uploadStageLabel}</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-[#F5F5F5] border border-[#B8B8B3] overflow-hidden">
            <div
              className="h-full bg-[#5B1018] transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Simulated Hero Preview Frame (Shows active Image OR Video) */}
      {showPreviewFrame && (
        <div className="border border-black bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
              {hasStagedLocal
                ? `Hero Preview Before Saving (${selectedMode.toUpperCase()})`
                : `Current Hero Preview (${selectedMode.toUpperCase()})`}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase border ${
                  previewViewport === 'desktop'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-[#B8B8B3]'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase border ${
                  previewViewport === 'mobile'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-[#B8B8B3]'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <div
            className={`relative mx-auto overflow-hidden bg-black flex items-center justify-center ${
              previewViewport === 'mobile'
                ? 'max-w-[360px] min-h-[420px]'
                : 'w-full min-h-[340px]'
            }`}
          >
            {showVideoInPreview ? (
              <video
                key={effectivePreviewVideoSrc}
                src={effectivePreviewVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={activePreviewImg}
                alt="Hero preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
            />

            <div className="relative z-10 px-6 py-10 text-center max-w-2xl mx-auto space-y-4">
              <h4 className="font-display text-xl md:text-3xl font-semibold text-white tracking-tight leading-tight">
                ENGINEERED FOR QUALITY. BUILT FOR EVERY KITCHEN.
              </h4>
              <p className="text-xs md:text-sm text-white/90 leading-relaxed max-w-xl mx-auto">
                Explore our range of stainless steel kitchenware, GN pans and commercial kitchen
                equipment, crafted for professional and everyday requirements.
              </p>
              <div
                className={`pt-2 flex items-center justify-center gap-3 ${
                  previewViewport === 'mobile' ? 'flex-col' : 'flex-wrap'
                }`}
              >
                <span className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-black text-[11px] font-semibold tracking-[0.08em] uppercase">
                  EXPLORE PRODUCTS
                </span>
                <span className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#5B1018] text-white text-[11px] font-semibold tracking-[0.08em] uppercase">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>GET A QUOTE ON WHATSAPP</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageLibraryModal
        open={libraryOpen}
        initialUsage="homepage"
        onSelectImage={(refUrl) => {
          if (stagedDesktopUrl) URL.revokeObjectURL(stagedDesktopUrl);
          if (stagedMobileUrl) URL.revokeObjectURL(stagedMobileUrl);
          setStagedDesktopFile(null);
          setStagedDesktopUrl('');
          setStagedMobileFile(null);
          setStagedMobileUrl('');
          setStagedImageFile(null);
          setStagedImagePreview('');
          setStagedImageRef(refUrl);
          setSelectedMode('image');
          setShowPreviewFrame(true);
          setNotice(
            'Hero Image selected from Library. Click SAVE CHANGES or PUBLISH / UPDATE WEBSITE.'
          );
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );
}
