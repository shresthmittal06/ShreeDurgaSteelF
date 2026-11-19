import { useEffect, useState } from 'react';
import { Check, Film, FolderOpen, RefreshCw, Trash2, Upload } from 'lucide-react';
import {
  CATEGORIES,
  type CategoryOverride,
  type MediaFormat,
  type MediaUsage,
  type SiteContent,
} from '../types/catalog';
import { compressImagePreserveRatio, uploadImageAssetToFirestore } from '../lib/mediaUtils';
import {
  formatVideoFileSize,
  uploadVideoAssetToFirestore,
  validateVideoFile,
} from '../lib/videoStorage';
import { useStore } from '../context/StoreContext';
import { BrandMark } from './BrandMark';
import { ImageLibraryModal } from './ImageLibraryModal';
import { LoopingVideo } from './LoopingVideo';

const DEFAULT_HOME_ABOUT_IMG =
  '/images/about_manufacturing_craft_1794728250935.jpg';

function getCatUsage(catId: string): MediaUsage {
  if (catId === 'gn-pans') return 'gn-pans';
  if (catId === 'commercial-kitchen-equipment') return 'commercial-kitchen';
  return 'kitchenware';
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

interface SectionMediaDraft {
  mediaType: MediaFormat;
  imageSrc: string;
  videoId: string;
  stagedImageFile?: File | null;
  stagedImagePreview?: string;
  stagedVideoFile?: File | null;
  stagedVideoPreview?: string;
}

export function CategoryAndBrandEditor() {
  const {
    adminContent,
    publishedContent,
    draftContent,
    resolveMediaSrc,
    saveSiteContent,
  } = useStore();

  const [logoUrl, setLogoUrl] = useState(adminContent.logoUrl || '');
  const [logoAlt, setLogoAlt] = useState(adminContent.logoAlt || 'SHREE DURGA STEELS Logo');
  const [logoDeleted, setLogoDeleted] = useState(Boolean(adminContent.logoDeleted));
  const initLogoXY = parsePositionXY(adminContent.logoPosition);
  const [logoX, setLogoX] = useState(initLogoXY.x);
  const [logoY, setLogoY] = useState(initLogoXY.y);

  const [catDrafts, setCatDrafts] = useState<Record<string, CategoryOverride>>(() => {
    const map: Record<string, CategoryOverride> = {};
    for (const c of CATEGORIES) {
      const ov = adminContent.categoryOverrides?.[c.id];
      const slot = adminContent.imageOverrides?.[`home.category.${c.id}`];
      map[c.id] = {
        title: ov?.title ?? c.title,
        navLabel: ov?.navLabel ?? c.navLabel,
        shortDescription: ov?.shortDescription ?? c.shortDescription,
        fullDescription: ov?.fullDescription ?? c.fullDescription,
        image: slot?.src ?? ov?.image ?? c.image,
        mediaType: slot?.mediaType || ov?.mediaType || 'image',
        videoId: slot?.videoId || ov?.videoId || '',
      };
    }
    return map;
  });

  const [sectionMedia, setSectionMedia] = useState<Record<string, SectionMediaDraft>>(() => {
    const map: Record<string, SectionMediaDraft> = {};
    for (const c of CATEGORIES) {
      const slot = adminContent.imageOverrides?.[`home.category.${c.id}`];
      const ov = adminContent.categoryOverrides?.[c.id];
      map[`home.category.${c.id}`] = {
        mediaType: slot?.mediaType || ov?.mediaType || 'image',
        imageSrc: slot?.src ?? ov?.image ?? c.image,
        videoId: slot?.videoId || ov?.videoId || '',
      };
    }
    const homeAboutSlot = adminContent.imageOverrides?.['home.about.image'];
    map['home.about.image'] = {
      mediaType: homeAboutSlot?.mediaType || 'image',
      imageSrc: homeAboutSlot?.src || DEFAULT_HOME_ABOUT_IMG,
      videoId: homeAboutSlot?.videoId || '',
    };
    return map;
  });

  // Keep synced with saved Firestore draft/published state after refresh
  useEffect(() => {
    setLogoUrl(adminContent.logoUrl || '');
    setLogoAlt(adminContent.logoAlt || 'SHREE DURGA STEELS Logo');
    setLogoDeleted(Boolean(adminContent.logoDeleted));
    const xy = parsePositionXY(adminContent.logoPosition);
    setLogoX(xy.x);
    setLogoY(xy.y);

    setCatDrafts(() => {
      const map: Record<string, CategoryOverride> = {};
      for (const c of CATEGORIES) {
        const ov = adminContent.categoryOverrides?.[c.id];
        const slot = adminContent.imageOverrides?.[`home.category.${c.id}`];
        map[c.id] = {
          title: ov?.title ?? c.title,
          navLabel: ov?.navLabel ?? c.navLabel,
          shortDescription: ov?.shortDescription ?? c.shortDescription,
          fullDescription: ov?.fullDescription ?? c.fullDescription,
          image: slot?.src ?? ov?.image ?? c.image,
          mediaType: slot?.mediaType || ov?.mediaType || 'image',
          videoId: slot?.videoId || ov?.videoId || '',
        };
      }
      return map;
    });

    setSectionMedia((prev) => {
      const next: Record<string, SectionMediaDraft> = {};
      for (const c of CATEGORIES) {
        const key = `home.category.${c.id}`;
        const existing = prev[key];
        const hasStaged = existing?.stagedImageFile || existing?.stagedVideoFile;
        if (hasStaged) {
          next[key] = existing;
        } else {
          const slot = adminContent.imageOverrides?.[key];
          const ov = adminContent.categoryOverrides?.[c.id];
          next[key] = {
            mediaType: slot?.mediaType || ov?.mediaType || 'image',
            imageSrc: slot?.src ?? ov?.image ?? c.image,
            videoId: slot?.videoId || ov?.videoId || '',
          };
        }
      }
      const aboutExisting = prev['home.about.image'];
      if (aboutExisting?.stagedImageFile || aboutExisting?.stagedVideoFile) {
        next['home.about.image'] = aboutExisting;
      } else {
        const homeAboutSlot = adminContent.imageOverrides?.['home.about.image'];
        next['home.about.image'] = {
          mediaType: homeAboutSlot?.mediaType || 'image',
          imageSrc: homeAboutSlot?.src || DEFAULT_HOME_ABOUT_IMG,
          videoId: homeAboutSlot?.videoId || '',
        };
      }
      return next;
    });
  }, [adminContent]);

  const [libraryTarget, setLibraryTarget] = useState<null | 'logo' | string>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await uploadImageAssetToFirestore({
        file,
        usage: 'branding',
        name: `Company Logo (${file.name})`,
      });
      setLogoUrl(res.refUrl);
      setLogoDeleted(false);
      setStatusMessage(
        'Logo preview updated. Click SAVE CHANGES to store permanently or PUBLISH / UPDATE WEBSITE.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleStageSectionImage = async (
    slotKey: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const processed = await compressImagePreserveRatio(file);
      setSectionMedia((prev) => {
        const old = prev[slotKey];
        if (old?.stagedVideoPreview) URL.revokeObjectURL(old.stagedVideoPreview);
        return {
          ...prev,
          [slotKey]: {
            mediaType: 'image',
            imageSrc: old?.imageSrc || '',
            videoId: '',
            stagedImageFile: file,
            stagedImagePreview: processed.dataUrl,
            stagedVideoFile: null,
            stagedVideoPreview: '',
          },
        };
      });
      setStatusMessage(
        `Image preview ready (${file.name}). Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE to apply live.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Image preview failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleStageSectionVideo = (
    slotKey: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      validateVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setSectionMedia((prev) => {
        const old = prev[slotKey];
        if (old?.stagedVideoPreview) URL.revokeObjectURL(old.stagedVideoPreview);
        return {
          ...prev,
          [slotKey]: {
            mediaType: 'video',
            imageSrc: old?.imageSrc || '',
            videoId: old?.videoId || '',
            stagedImageFile: null,
            stagedImagePreview: '',
            stagedVideoFile: file,
            stagedVideoPreview: previewUrl,
          },
        };
      });
      setStatusMessage(
        `Video preview ready (${file.name} · ${formatVideoFileSize(file.size)}). Click SAVE CHANGES to store permanently, or PUBLISH / UPDATE WEBSITE.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Video preview failed.');
    }
  };

  const handleSave = async (mode: 'save-draft' | 'publish') => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setUploadProgressText('');

    try {
      const base: SiteContent = adminContent;
      const nextImgOverrides = { ...(base.imageOverrides || {}) };
      const nextCatDrafts: Record<string, CategoryOverride> = {};

      for (const c of CATEGORIES) {
        const slotKey = `home.category.${c.id}`;
        const draftMedia = sectionMedia[slotKey];
        let finalType: MediaFormat = draftMedia?.mediaType || 'image';
        let finalImgSrc = draftMedia?.imageSrc || catDrafts[c.id]?.image || c.image;
        let finalVidId = draftMedia?.videoId || '';

        if (draftMedia?.stagedImageFile) {
          setUploadProgressText(`Uploading image for ${c.title}...`);
          const res = await uploadImageAssetToFirestore({
            file: draftMedia.stagedImageFile,
            usage: getCatUsage(c.id),
            name: `Category Image: ${catDrafts[c.id]?.title || c.title}`,
          });
          finalType = 'image';
          finalImgSrc = res.refUrl;
          finalVidId = '';
        } else if (draftMedia?.stagedVideoFile) {
          setUploadProgressText(`Uploading video for ${c.title}...`);
          const vidRes = await uploadVideoAssetToFirestore({
            file: draftMedia.stagedVideoFile,
            variant: 'section',
            name: `${catDrafts[c.id]?.title || c.title} Video`,
            onProgress: (pct) =>
              setUploadProgressText(`Uploading video for ${c.title} (${pct}%)...`),
          });
          finalType = 'video';
          finalVidId = vidRes.id;
        }

        if (finalType === 'image') finalVidId = '';

        nextCatDrafts[c.id] = {
          ...catDrafts[c.id],
          image: finalImgSrc,
          mediaType: finalType,
          videoId: finalVidId,
        };

        nextImgOverrides[slotKey] = {
          ...(nextImgOverrides[slotKey] || {}),
          src: finalImgSrc,
          alt: catDrafts[c.id]?.title || c.title,
          deleted: false,
          mediaType: finalType,
          videoId: finalVidId,
        };
      }

      // Homepage About Section Media (`home.about.image`)
      const aboutMediaDraft = sectionMedia['home.about.image'];
      if (aboutMediaDraft) {
        let finalAboutType: MediaFormat = aboutMediaDraft.mediaType || 'image';
        let finalAboutImg = aboutMediaDraft.imageSrc || DEFAULT_HOME_ABOUT_IMG;
        let finalAboutVidId = aboutMediaDraft.videoId || '';

        if (aboutMediaDraft.stagedImageFile) {
          setUploadProgressText('Uploading Homepage About Section image...');
          const res = await uploadImageAssetToFirestore({
            file: aboutMediaDraft.stagedImageFile,
            usage: 'about',
            name: 'Homepage About Section Image',
          });
          finalAboutType = 'image';
          finalAboutImg = res.refUrl;
          finalAboutVidId = '';
        } else if (aboutMediaDraft.stagedVideoFile) {
          setUploadProgressText('Uploading Homepage About Section video...');
          const vidRes = await uploadVideoAssetToFirestore({
            file: aboutMediaDraft.stagedVideoFile,
            variant: 'section',
            name: 'Homepage About Section Video',
            onProgress: (pct) =>
              setUploadProgressText(`Uploading Homepage About Section video (${pct}%)...`),
          });
          finalAboutType = 'video';
          finalAboutVidId = vidRes.id;
        }

        if (finalAboutType === 'image') finalAboutVidId = '';

        nextImgOverrides['home.about.image'] = {
          ...(nextImgOverrides['home.about.image'] || {}),
          src: finalAboutImg,
          alt:
            nextImgOverrides['home.about.image']?.alt ||
            'Stainless steel manufacturing workshop and raw steel sheet stock',
          deleted: false,
          mediaType: finalAboutType,
          videoId: finalAboutVidId,
        };
      }

      const nextContent: SiteContent = {
        ...base,
        logoUrl: logoDeleted ? '' : logoUrl,
        logoAlt,
        logoPosition: `${logoX}% ${logoY}%`,
        logoDeleted,
        categoryOverrides: nextCatDrafts,
        imageOverrides: nextImgOverrides,
      };

      await saveSiteContent(nextContent, mode);

      // Clear local staged blob previews after save
      setSectionMedia((prev) => {
        const cleaned: Record<string, SectionMediaDraft> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.stagedVideoPreview) URL.revokeObjectURL(v.stagedVideoPreview);
          cleaned[k] = {
            mediaType: nextImgOverrides[k]?.mediaType || v.mediaType,
            imageSrc: nextImgOverrides[k]?.src || v.imageSrc,
            videoId: nextImgOverrides[k]?.videoId || '',
          };
        }
        return cleaned;
      });
      setCatDrafts(nextCatDrafts);

      setStatusMessage(
        mode === 'save-draft'
          ? 'Changes saved permanently! Click PUBLISH / UPDATE WEBSITE to apply them to the live site.'
          : 'Published permanently! Your updated images, videos, and category edits are now live.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save website section media & category updates.'
      );
    } finally {
      setSaving(false);
      setUploadProgressText('');
    }
  };

  const handleCancel = () => {
    const reset = draftContent || publishedContent;
    setLogoUrl(reset.logoUrl || '');
    setLogoAlt(reset.logoAlt || 'SHREE DURGA STEELS Logo');
    setLogoDeleted(Boolean(reset.logoDeleted));
    const xy = parsePositionXY(reset.logoPosition);
    setLogoX(xy.x);
    setLogoY(xy.y);

    const map: Record<string, CategoryOverride> = {};
    const mediaMap: Record<string, SectionMediaDraft> = {};
    for (const c of CATEGORIES) {
      const ov = reset.categoryOverrides?.[c.id];
      const slot = reset.imageOverrides?.[`home.category.${c.id}`];
      const old = sectionMedia[`home.category.${c.id}`];
      if (old?.stagedVideoPreview) URL.revokeObjectURL(old.stagedVideoPreview);
      map[c.id] = {
        title: ov?.title ?? c.title,
        navLabel: ov?.navLabel ?? c.navLabel,
        shortDescription: ov?.shortDescription ?? c.shortDescription,
        fullDescription: ov?.fullDescription ?? c.fullDescription,
        image: slot?.src ?? ov?.image ?? c.image,
        mediaType: slot?.mediaType || ov?.mediaType || 'image',
        videoId: slot?.videoId || ov?.videoId || '',
      };
      mediaMap[`home.category.${c.id}`] = {
        mediaType: slot?.mediaType || ov?.mediaType || 'image',
        imageSrc: slot?.src ?? ov?.image ?? c.image,
        videoId: slot?.videoId || ov?.videoId || '',
      };
    }

    const oldAbout = sectionMedia['home.about.image'];
    if (oldAbout?.stagedVideoPreview) URL.revokeObjectURL(oldAbout.stagedVideoPreview);
    const aboutSlot = reset.imageOverrides?.['home.about.image'];
    mediaMap['home.about.image'] = {
      mediaType: aboutSlot?.mediaType || 'image',
      imageSrc: aboutSlot?.src || DEFAULT_HOME_ABOUT_IMG,
      videoId: aboutSlot?.videoId || '',
    };

    setCatDrafts(map);
    setSectionMedia(mediaMap);
    setStatusMessage('Cancelled unsaved local media & category edits.');
  };

  const resolvedLogo = !logoDeleted ? resolveMediaSrc(logoUrl) : undefined;
  const homeAboutMedia = sectionMedia['home.about.image'];
  const homeAboutResolvedImg = resolveMediaSrc(
    homeAboutMedia?.imageSrc || DEFAULT_HOME_ABOUT_IMG
  );

  return (
    <div className="space-y-8">
      {/* Top Quick Save Bar */}
      <div className="border border-black bg-[#F3E7DA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-black">
          <p className="font-semibold uppercase tracking-[0.06em] text-[#5B1018]">
            Brand Logo, Category Cards &amp; Homepage About Media
          </p>
          <p className="text-[#292321]/80">
            After uploading any image or video below, click Save Changes or Publish / Update Website.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSave('save-draft')}
            className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSave('publish')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>PUBLISH / UPDATE WEBSITE</span>
          </button>
        </div>
      </div>

      {/* 1. Company Logo Management */}
      <div className="border border-[#B8B8B3]/80 bg-white p-6 space-y-4">
        <div className="border-b border-[#B8B8B3]/50 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
            Brand Identity
          </p>
          <h3 className="font-display text-lg font-semibold text-black">
            Company Logo &amp; Position
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 border border-[#B8B8B3] bg-[#F5F5F5] p-6 flex items-center justify-center gap-3">
            {logoDeleted ? (
              <span className="text-xs font-mono text-[#5B1018]">[Logo Deleted]</span>
            ) : resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={logoAlt}
                style={{
                  objectPosition: `${logoX}% ${logoY}%`,
                  objectFit: 'contain',
                }}
                className="w-12 h-12 shrink-0"
              />
            ) : (
              <BrandMark variant="light" className="w-10 h-10 shrink-0" />
            )}
            <span className="font-display text-sm font-semibold tracking-[0.06em] text-black">
              SHREE DURGA STEELS
            </span>
          </div>

          <div className="md:col-span-8 space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold uppercase cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleUploadLogo}
                  className="sr-only"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase cursor-pointer hover:bg-[#F5F5F5]">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleUploadLogo}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setLibraryTarget('logo')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase hover:bg-[#F5F5F5]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>From Library</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoUrl('');
                  setLogoDeleted(false);
                }}
                className="px-3 py-2 border border-[#B8B8B3] text-xs font-semibold uppercase text-black hover:border-black"
              >
                Restore Default Mark
              </button>
              <button
                type="button"
                onClick={() => setLogoDeleted(true)}
                className="inline-flex items-center gap-1 px-3 py-2 border border-[#5B1018] text-[#5B1018] text-xs font-semibold uppercase hover:bg-[#F3E7DA]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="font-mono">Position X: {logoX}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={logoX}
                  onChange={(e) => setLogoX(Number(e.target.value))}
                  className="w-full accent-[#5B1018]"
                />
              </div>
              <div>
                <span className="font-mono">Position Y: {logoY}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={logoY}
                  onChange={(e) => setLogoY(Number(e.target.value))}
                  className="w-full accent-[#5B1018]"
                />
              </div>
              <div>
                <span className="font-semibold uppercase">Alt Text</span>
                <input
                  type="text"
                  value={logoAlt}
                  onChange={(e) => setLogoAlt(e.target.value)}
                  className="w-full px-2.5 py-1 border border-[#B8B8B3] text-xs mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Product Category Cards & Homepage About Section (Image or Video) */}
      <div className="border border-[#B8B8B3]/80 bg-white p-6 space-y-6">
        <div className="border-b border-[#B8B8B3]/50 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
            Homepage Sections Media (Image or Video)
          </p>
          <h3 className="font-display text-lg font-semibold text-black">
            Product Category Cards &amp; Homepage About Media
          </h3>
          <p className="text-xs text-[#292321]/75 mt-1">
            Upload either an Image or a Video for any card or section. The live website
            automatically displays whichever format is saved inside the same layout container.
          </p>
        </div>

        {/* 3 Category Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const draft = catDrafts[cat.id] || {};
            const slotKey = `home.category.${cat.id}`;
            const media = sectionMedia[slotKey];
            const isVideo =
              media?.mediaType === 'video' &&
              Boolean(media.stagedVideoPreview || media.videoId);
            const previewImg =
              media?.stagedImagePreview ||
              resolveMediaSrc(media?.imageSrc || draft.image || cat.image);
            const hasStaged = Boolean(
              media?.stagedImageFile || media?.stagedVideoFile
            );

            return (
              <div
                key={cat.id}
                className={`border bg-[#F5F5F5] p-4 space-y-3 ${
                  hasStaged ? 'border-[#5B1018]' : 'border-[#B8B8B3]/80'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase">
                  <span className="text-[#5B1018]">
                    Active: {isVideo ? 'Video' : 'Image'}
                  </span>
                  {hasStaged && (
                    <span className="font-mono text-black">Preview Ready</span>
                  )}
                </div>

                <div className="aspect-[4/3] bg-white border border-[#B8B8B3]/70 overflow-hidden">
                  {isVideo ? (
                    <LoopingVideo
                      directSrc={media.stagedVideoPreview || undefined}
                      videoId={!media.stagedVideoPreview ? media.videoId : undefined}
                      fallbackImgSrc={previewImg}
                      fallbackAlt={draft.title || cat.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    previewImg && (
                      <img
                        src={previewImg}
                        alt={draft.title || cat.title}
                        className="w-full h-full object-cover"
                      />
                    )
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer hover:bg-[#292321]">
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading || saving}
                      onChange={(e) => handleStageSectionImage(slotKey, e)}
                      className="sr-only"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#5B1018] text-white text-[11px] font-semibold uppercase cursor-pointer hover:bg-[#430b11]">
                    <Film className="w-3 h-3" />
                    <span>Upload Video</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      disabled={uploading || saving}
                      onChange={(e) => handleStageSectionVideo(slotKey, e)}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setLibraryTarget(slotKey)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-black bg-white text-black text-[11px] font-semibold uppercase hover:bg-white/70"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Library</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#292321]/75 mb-1">
                    Category Title
                  </label>
                  <input
                    type="text"
                    value={draft.title ?? ''}
                    onChange={(e) =>
                      setCatDrafts((prev) => ({
                        ...prev,
                        [cat.id]: { ...prev[cat.id], title: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#292321]/75 mb-1">
                    Navigation Dropdown Label
                  </label>
                  <input
                    type="text"
                    value={draft.navLabel ?? ''}
                    onChange={(e) =>
                      setCatDrafts((prev) => ({
                        ...prev,
                        [cat.id]: { ...prev[cat.id], navLabel: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#292321]/75 mb-1">
                    Short Description (Homepage)
                  </label>
                  <textarea
                    rows={2}
                    value={draft.shortDescription ?? ''}
                    onChange={(e) =>
                      setCatDrafts((prev) => ({
                        ...prev,
                        [cat.id]: {
                          ...prev[cat.id],
                          shortDescription: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#292321]/75 mb-1">
                    Full Description (Category Header)
                  </label>
                  <textarea
                    rows={2}
                    value={draft.fullDescription ?? ''}
                    onChange={(e) =>
                      setCatDrafts((prev) => ({
                        ...prev,
                        [cat.id]: {
                          ...prev[cat.id],
                          fullDescription: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Homepage Section 3: About SHREE DURGA STEELS Media Slot */}
        <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 aspect-[4/3] bg-white border border-[#B8B8B3] overflow-hidden">
            {homeAboutMedia?.mediaType === 'video' &&
            (homeAboutMedia.stagedVideoPreview || homeAboutMedia.videoId) ? (
              <LoopingVideo
                directSrc={homeAboutMedia.stagedVideoPreview || undefined}
                videoId={
                  !homeAboutMedia.stagedVideoPreview ? homeAboutMedia.videoId : undefined
                }
                fallbackImgSrc={homeAboutMedia.stagedImagePreview || homeAboutResolvedImg}
                fallbackAlt="Homepage About Section Media"
                className="w-full h-full object-cover"
              />
            ) : (
              (homeAboutMedia?.stagedImagePreview || homeAboutResolvedImg) && (
                <img
                  src={homeAboutMedia?.stagedImagePreview || homeAboutResolvedImg}
                  alt="Homepage About Section Media"
                  className="w-full h-full object-cover"
                />
              )
            )}
          </div>

          <div className="md:col-span-8 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                Homepage Section 3 · Active:{' '}
                {homeAboutMedia?.mediaType === 'video' ? 'Video' : 'Image'}
              </p>
              <h4 className="font-display text-base font-semibold text-black">
                Homepage &ldquo;About SHREE DURGA STEELS&rdquo; Section Media
              </h4>
              <p className="text-xs text-[#292321]/75 mt-1">
                Displays either your uploaded photograph or a muted looping video beside the
                Homepage About overview.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold uppercase cursor-pointer hover:bg-[#292321]">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading || saving}
                  onChange={(e) => handleStageSectionImage('home.about.image', e)}
                  className="sr-only"
                />
              </label>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase cursor-pointer hover:bg-[#430b11]">
                <Film className="w-3.5 h-3.5" />
                <span>Upload Video</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  disabled={uploading || saving}
                  onChange={(e) => handleStageSectionVideo('home.about.image', e)}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => setLibraryTarget('home.about.image')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase hover:bg-white/70"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Image Library</span>
              </button>
            </div>
          </div>
        </div>

        {uploadProgressText && (
          <div className="p-3 bg-[#F5F5F5] border border-black text-xs font-mono text-black">
            {uploadProgressText}
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

        <div className="pt-3 border-t border-[#B8B8B3]/60 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleCancel}
            className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
          >
            CANCEL
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('save-draft')}
              className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('publish')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>PUBLISH / UPDATE WEBSITE</span>
            </button>
          </div>
        </div>
      </div>

      <ImageLibraryModal
        open={libraryTarget !== null}
        initialUsage={
          libraryTarget === 'logo'
            ? 'branding'
            : libraryTarget === 'home.about.image'
            ? 'about'
            : libraryTarget?.startsWith('home.category.')
            ? getCatUsage(libraryTarget.replace('home.category.', ''))
            : 'general'
        }
        onSelectImage={(refUrl, alt) => {
          if (libraryTarget === 'logo') {
            setLogoUrl(refUrl);
            if (alt) setLogoAlt(alt);
            setLogoDeleted(false);
          } else if (libraryTarget) {
            setSectionMedia((prev) => {
              const old = prev[libraryTarget];
              if (old?.stagedVideoPreview) URL.revokeObjectURL(old.stagedVideoPreview);
              return {
                ...prev,
                [libraryTarget]: {
                  mediaType: 'image',
                  imageSrc: refUrl,
                  videoId: '',
                },
              };
            });
            if (libraryTarget.startsWith('home.category.')) {
              const catId = libraryTarget.replace('home.category.', '');
              setCatDrafts((prev) => ({
                ...prev,
                [catId]: {
                  ...prev[catId],
                  image: refUrl,
                  mediaType: 'image',
                  videoId: '',
                },
              }));
            }
          }
          setStatusMessage(
            'Image selected from library. Click SAVE CHANGES or PUBLISH / UPDATE WEBSITE.'
          );
        }}
        onClose={() => setLibraryTarget(null)}
      />
    </div>
  );
}
