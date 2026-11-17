import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Eye,
  FolderOpen,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  compressImagePreserveRatio,
  uploadImageAssetToFirestore,
} from '../lib/mediaUtils';
import { saveProductRecordToFirestore } from '../lib/productPersistence';
import { useStore } from '../context/StoreContext';
import type { MediaUsage, Product } from '../types/catalog';
import { ImageLibraryModal } from './ImageLibraryModal';

interface ProductSingleImageModalProps {
  product: Product;
  onClose: () => void;
}

function getUsageForCategory(category: Product['category']): MediaUsage {
  if (category === 'gn-pans') return 'gn-pans';
  if (category === 'commercial-kitchen-equipment') return 'commercial-kitchen';
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

export function ProductSingleImageModal({
  product,
  onClose,
}: ProductSingleImageModalProps) {
  const {
    realProducts,
    resolveMediaSrc,
    isAdmin,
    user,
    authReady,
    signInAdmin,
    signOutAdmin,
  } = useStore();
  const usage = getUsageForCategory(product.category);
  const existingFirestoreDoc = realProducts.find((p) => p.id === product.id);

  const [savedRef, setSavedRef] = useState(product.mainImage || '');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState('');
  const initPos = parsePositionXY(product.mainImagePosition);
  const [posX, setPosX] = useState(initPos.x);
  const [posY, setPosY] = useState(initPos.y);
  const [fit, setFit] = useState<'contain' | 'cover'>(
    product.mainImageFit || 'contain'
  );

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawDisplaySrc = stagedPreviewUrl || savedRef;
  const resolvedDisplaySrc = stagedPreviewUrl
    ? stagedPreviewUrl
    : resolveMediaSrc(savedRef);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreparing(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const processed = await compressImagePreserveRatio(file);
      setStagedFile(file);
      setStagedPreviewUrl(processed.dataUrl);
      setStatusMessage(
        'Image uploaded and ready to preview. Click SAVE & PUBLISH IMAGE to save permanently.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not load image file.'
      );
    } finally {
      setPreparing(false);
      e.target.value = '';
    }
  };

  const handleAdminSignIn = async () => {
    setSigningIn(true);
    setErrorMessage(null);
    try {
      if (user && !isAdmin) {
        await signOutAdmin();
      }
      await signInAdmin();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Google sign-in failed.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!isAdmin) {
      setErrorMessage('Please sign in with your Admin Google account to delete saved images.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      setStagedFile(null);
      setStagedPreviewUrl('');
      setSavedRef('');
      await saveProductRecordToFirestore(
        {
          ...product,
          mainImage: undefined,
          additionalImages: undefined,
        },
        existingFirestoreDoc
      );
      setStatusMessage(`Deleted photograph for "${product.name}".`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete product image.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!isAdmin) {
      setErrorMessage('Please sign in with your Admin Google account first, then click Save & Publish.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      let finalRef = savedRef.trim();
      if (stagedFile) {
        const uploaded = await uploadImageAssetToFirestore({
          file: stagedFile,
          usage,
          name: `${product.name} Photograph`,
        });
        finalRef = uploaded.refUrl;
        setSavedRef(finalRef);
        setStagedFile(null);
        setStagedPreviewUrl('');
      }

      await saveProductRecordToFirestore(
        {
          ...product,
          mainImage: finalRef || undefined,
          mainImagePosition: `${posX}% ${posY}%`,
          mainImageFit: fit,
          additionalImages: undefined,
        },
        existingFirestoreDoc
      );

      setStatusMessage(
        `Saved & published photograph for "${product.name}" permanently.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save product photograph. Please check your connection.'
      );
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white border border-black max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#B8B8B3]/60 px-6 pt-5 pb-3 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
              Product Image Management (1 Image per Product)
            </p>
            <h2 className="font-display text-xl font-semibold text-black">
              {product.name}
            </h2>
            {product.modelNumber && (
              <p className="text-xs font-mono text-[#292321]/70">
                {product.modelNumber}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
            aria-label="Close product image modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {authReady && !isAdmin && (
            <div className="border border-[#5B1018] bg-[#F3E7DA] p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-black space-y-0.5">
                <p className="font-semibold uppercase tracking-[0.05em] text-[#5B1018]">
                  Admin Sign-In Required to Save Permanently
                </p>
                <p className="text-[#292321]/85">
                  {user
                    ? `Signed in as ${user.email}. Switch to the Shree Durga Steels admin account.`
                    : 'Select an image to preview now, and sign in with Google to save & publish.'}
                </p>
              </div>
              <button
                type="button"
                disabled={signingIn}
                onClick={handleAdminSignIn}
                className="px-3.5 py-2 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.06em] hover:bg-black disabled:opacity-60"
              >
                {signingIn
                  ? 'Signing In...'
                  : user
                  ? 'Switch Google Account'
                  : 'Sign In with Google'}
              </button>
            </div>
          )}

          {/* Single Image Preview Frame (preserving original aspect ratio) */}
          <div className="h-52 sm:h-60 border border-[#B8B8B3] bg-[#F5F5F5] overflow-hidden flex items-center justify-center p-4">
            {resolvedDisplaySrc ? (
              <img
                src={resolvedDisplaySrc}
                alt={product.name}
                style={{
                  objectPosition: `${posX}% ${posY}%`,
                  objectFit: fit,
                }}
                className={
                  fit === 'cover'
                    ? 'w-full h-full'
                    : 'max-w-full max-h-full w-auto h-auto'
                }
              />
            ) : (
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#292321]/60">
                No Image Uploaded Yet
              </p>
            )}
          </div>

          {/* Upload / Replace / Save / Library / Delete Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {!rawDisplaySrc ? (
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-[0.05em] cursor-pointer hover:bg-[#292321]">
                <Upload className="w-3.5 h-3.5" />
                <span>{preparing ? 'Preparing...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={preparing || saving}
                  onChange={handleSelectFile}
                  className="sr-only"
                />
              </label>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-[0.05em] cursor-pointer hover:bg-[#292321]">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{preparing ? 'Preparing...' : 'Replace Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={preparing || saving}
                  onChange={handleSelectFile}
                  className="sr-only"
                />
              </label>
            )}

            {isAdmin && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase tracking-[0.05em] hover:bg-[#F5F5F5]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>
            )}

            {rawDisplaySrc && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteImage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#5B1018] text-[#5B1018] text-xs font-semibold uppercase tracking-[0.05em] hover:bg-[#F3E7DA] disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Image</span>
              </button>
            )}

            {rawDisplaySrc && (
              <button
                type="button"
                disabled={saving || preparing}
                onClick={handleSaveAndPublish}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.05em] hover:bg-[#430b11] disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Image'}</span>
              </button>
            )}
          </div>

        {/* Position & Fit */}
        {rawDisplaySrc && (
          <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-3 space-y-2 text-[11px]">
            <p className="font-semibold uppercase tracking-[0.06em] text-black">
              Adjust Image Position &amp; Proportions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <div>
                <span className="font-mono">X: {posX}%</span>
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
                <span className="font-mono">Y: {posY}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  className="w-full accent-[#5B1018]"
                />
              </div>
              <select
                aria-label="Image Fit"
                value={fit}
                onChange={(e) => setFit(e.target.value as 'contain' | 'cover')}
                className="px-2 py-1.5 border border-[#B8B8B3] bg-white text-xs"
              >
                <option value="contain">Original Proportions</option>
                <option value="cover">Fill Container</option>
              </select>
            </div>
          </div>
        )}

        {/* Product Card Preview Box */}
        {showCardPreview && rawDisplaySrc && (
          <div className="border border-black bg-[#F5F5F5] p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
              Live Product Card Preview
            </p>
            <div className="bg-white border border-[#B8B8B3] max-w-xs">
              <div className="aspect-[4/3] bg-[#F5F5F5] border-b border-[#B8B8B3]/50 flex items-center justify-center p-3 overflow-hidden">
                {resolvedDisplaySrc && (
                  <img
                    src={resolvedDisplaySrc}
                    alt={product.name}
                    style={{
                      objectPosition: `${posX}% ${posY}%`,
                      objectFit: fit,
                    }}
                    className={
                      fit === 'cover'
                        ? 'w-full h-full'
                        : 'max-w-full max-h-full w-auto h-auto'
                    }
                  />
                )}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-mono text-[#5B1018]">
                  {product.modelNumber}
                </p>
                <p className="font-display text-sm font-semibold text-black">
                  {product.name}
                </p>
              </div>
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
            onClick={onClose}
            className="px-4 py-2 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase text-black hover:border-black"
          >
            Close
          </button>
          <div className="flex flex-wrap gap-2">
            {rawDisplaySrc && (
              <button
                type="button"
                onClick={() => setShowCardPreview((p) => !p)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-black bg-white text-xs font-semibold uppercase text-black hover:bg-[#F5F5F5]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showCardPreview ? 'Hide Card Preview' : 'Card Preview'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={saving || preparing}
              onClick={handleSaveAndPublish}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      <ImageLibraryModal
        open={libraryOpen}
        initialUsage={usage}
        onSelectImage={(refUrl) => {
          setStagedFile(null);
          setStagedPreviewUrl('');
          setSavedRef(refUrl);
          setStatusMessage(
            'Image selected from library. Click Save & Publish to apply it permanently.'
          );
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
