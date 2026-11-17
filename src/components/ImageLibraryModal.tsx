import { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BUILTIN_WEBSITE_IMAGES,
  MEDIA_USAGE_OPTIONS,
  type MediaAsset,
  type MediaUsage,
} from '../types/catalog';
import {
  deleteImageAssetFromFirestore,
  replaceImageAssetFileInFirestore,
  uploadImageAssetToFirestore,
} from '../lib/mediaUtils';
import { useStore } from '../context/StoreContext';

interface ImageLibraryPanelProps {
  initialUsage?: MediaUsage | 'all';
  onSelectImage?: (refUrl: string, altText?: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function ImageLibraryPanel({
  initialUsage = 'all',
  onSelectImage,
  onClose,
  isModal = false,
}: ImageLibraryPanelProps) {
  const { mediaAssets, getAssetUsages, resolveMediaSrc } = useStore();

  const [usageFilter, setUsageFilter] = useState<MediaUsage | 'all'>(initialUsage);
  const [uploadUsage, setUploadUsage] = useState<MediaUsage>(
    initialUsage === 'all' ? 'general' : initialUsage
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<{ src: string; name: string } | null>(
    null
  );

  const filteredUploaded = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return mediaAssets.filter((asset) => {
      if (usageFilter !== 'all' && asset.usage !== usageFilter) return false;
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.usage.toLowerCase().includes(q) ||
        (asset.altText || '').toLowerCase().includes(q)
      );
    });
  }, [mediaAssets, usageFilter, searchTerm]);

  const filteredBuiltins = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return BUILTIN_WEBSITE_IMAGES.filter((item) => {
      if (usageFilter !== 'all' && item.usage !== usageFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) || item.usage.toLowerCase().includes(q)
      );
    });
  }, [usageFilter, searchTerm]);

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMsg(null);
    setFeedback(null);
    let lastUploaded: { refUrl: string; name: string } | null = null;
    try {
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImageAssetToFirestore({
          file: files[i],
          usage: uploadUsage,
        });
        lastUploaded = { refUrl: res.refUrl, name: res.asset.name };
      }
      setFeedback(
        files.length === 1 && lastUploaded
          ? `Uploaded "${lastUploaded.name}" to Image Library.`
          : `Uploaded ${files.length} images to Image Library.`
      );
      if (usageFilter !== 'all' && usageFilter !== uploadUsage) {
        setUsageFilter(uploadUsage);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to upload image to library.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReplaceAsset = async (
    asset: MediaAsset,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyId(asset.id);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await replaceImageAssetFileInFirestore(asset.id, file);
      setFeedback(`Replaced image file for "${asset.name}".`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to replace image file.'
      );
    } finally {
      setBusyId(null);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    const usages = getAssetUsages(asset.id);
    if (usages.length > 0) {
      setErrorMsg(
        `Cannot delete "${asset.name}" while in use (${usages.join(', ')}). Replace or remove it from those slots first.`
      );
      return;
    }
    setBusyId(asset.id);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await deleteImageAssetFromFirestore(asset.id);
      setFeedback(`Deleted unused image "${asset.name}" from Image Library.`);
    } catch {
      setErrorMsg('Failed to delete image from Firestore.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Upload Strip */}
      <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-black">
              Central Image Library ({mediaAssets.length} uploaded ·{' '}
              {BUILTIN_WEBSITE_IMAGES.length} built-in)
            </h2>
            <p className="text-xs text-[#292321]/75 mt-0.5">
              Images uploaded here are stored permanently in Firestore and accessible
              across devices.
            </p>
          </div>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-[#B8B8B3] bg-white text-black hover:border-black"
              aria-label="Close image library"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]/70 mb-1">
              Search Images
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#292321]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by image name or section..."
                className="w-full pl-9 pr-3 py-2 border border-[#B8B8B3] bg-white text-xs text-black focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]/70 mb-1">
              Upload Into Usage Group
            </label>
            <select
              value={uploadUsage}
              onChange={(e) => setUploadUsage(e.target.value as MediaUsage)}
              className="w-full px-3 py-2 border border-[#B8B8B3] bg-white text-xs text-black focus:border-black focus:outline-none"
            >
              {MEDIA_USAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] cursor-pointer hover:bg-[#430b11] transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload Image(s)'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={handleUploadFiles}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Website Usage Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#B8B8B3]/50">
          <button
            type="button"
            onClick={() => setUsageFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              usageFilter === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
            }`}
          >
            All Images
          </button>
          {MEDIA_USAGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setUsageFilter(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                usageFilter === opt.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[#5B1018] font-semibold uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018] flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="font-semibold uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Uploaded Assets Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#292321]/70">
          Uploaded Permanent Images ({filteredUploaded.length})
        </h3>
        {filteredUploaded.length === 0 ? (
          <div className="border border-[#B8B8B3]/70 bg-white p-8 text-center text-xs text-[#292321]/70">
            No uploaded images match this filter yet. Use &ldquo;Upload Image(s)&rdquo;
            above to add images to permanent storage.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredUploaded.map((asset) => {
              const usages = getAssetUsages(asset.id);
              const usageLabel =
                MEDIA_USAGE_OPTIONS.find((u) => u.id === asset.usage)?.label ||
                asset.usage;
              const isBusy = busyId === asset.id;
              return (
                <div
                  key={asset.id}
                  className="border border-[#B8B8B3]/80 bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-[#F5F5F5] border-b border-[#B8B8B3]/50 relative overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={asset.dataUrl}
                        alt={asset.altText || asset.name}
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5B1018] truncate">
                        {usageLabel}
                      </p>
                      <p className="text-xs font-semibold text-black truncate">
                        {asset.name}
                      </p>
                      <p className="text-[11px] font-mono text-[#292321]/65 tabular-nums">
                        {asset.width && asset.height
                          ? `${asset.width}×${asset.height}px`
                          : asset.mimeType}
                      </p>
                      <p className="text-[11px] text-[#292321]/75 truncate">
                        {usages.length > 0 ? `In use: ${usages.join(', ')}` : 'Unused'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 pt-0 space-y-1.5">
                    {onSelectImage && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectImage(`media://${asset.id}`, asset.altText || asset.name)
                        }
                        className="w-full py-2 px-2.5 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] inline-flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Use Image</span>
                      </button>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSrc({ src: asset.dataUrl, name: asset.name })
                        }
                        title="Preview"
                        className="py-1.5 border border-[#B8B8B3] text-[11px] font-medium text-black hover:border-black inline-flex items-center justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <label
                        title="Replace Image File"
                        className="py-1.5 border border-[#B8B8B3] text-[11px] font-medium text-black hover:border-black inline-flex items-center justify-center cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isBusy}
                          onChange={(e) => handleReplaceAsset(asset, e)}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteAsset(asset)}
                        title={
                          usages.length > 0
                            ? 'Image is currently in use'
                            : 'Delete unused image'
                        }
                        className={`py-1.5 border text-[11px] font-medium inline-flex items-center justify-center ${
                          usages.length > 0
                            ? 'border-[#B8B8B3]/50 text-[#292321]/35 cursor-not-allowed'
                            : 'border-[#B8B8B3] text-[#5B1018] hover:border-[#5B1018]'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Existing Website Images */}
      {filteredBuiltins.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#B8B8B3]/50">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#292321]/70">
            Default Website Photographs ({filteredBuiltins.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredBuiltins.map((item) => {
              const resolved = resolveMediaSrc(item.src) || item.src;
              return (
                <div
                  key={item.id}
                  className="border border-[#B8B8B3]/70 bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-[#F5F5F5] border-b border-[#B8B8B3]/50 overflow-hidden">
                      <img
                        src={resolved}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-semibold text-black truncate">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 pt-0 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewSrc({ src: resolved, name: item.name })}
                      className="flex-1 py-1.5 border border-[#B8B8B3] text-[10px] font-semibold uppercase text-black hover:border-black"
                    >
                      Preview
                    </button>
                    {onSelectImage && (
                      <button
                        type="button"
                        onClick={() => onSelectImage(item.src, item.name)}
                        className="flex-1 py-1.5 bg-black text-white text-[10px] font-semibold uppercase hover:bg-[#5B1018]"
                      >
                        Reuse
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Preview Lightbox */}
      {previewSrc && (
        <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white border border-black max-w-3xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B8B8B3]/50 pb-3">
              <p className="font-display text-base font-semibold text-black">
                {previewSrc.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewSrc(null)}
                className="p-1.5 border border-[#B8B8B3] hover:border-black"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#F5F5F5] border border-[#B8B8B3]/50 max-h-[70vh] flex items-center justify-center p-4 overflow-hidden">
              <img
                src={previewSrc.src}
                alt={previewSrc.name}
                className="max-w-full max-h-[64vh] w-auto h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageLibraryModalProps {
  open: boolean;
  initialUsage?: MediaUsage | 'all';
  onSelectImage: (refUrl: string, altText?: string) => void;
  onClose: () => void;
}

export function ImageLibraryModal({
  open,
  initialUsage = 'all',
  onSelectImage,
  onClose,
}: ImageLibraryModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-black max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
        <ImageLibraryPanel
          isModal
          initialUsage={initialUsage}
          onSelectImage={(refUrl, alt) => {
            onSelectImage(refUrl, alt);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
