import { useEffect, useState } from 'react';
import { Pencil, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/catalog';
import { ProductSingleImageModal } from './ProductSingleImageModal';

interface ProductVisualProps {
  src?: string;
  alt: string;
  modelNumber?: string;
  isPlaceholder?: boolean;
  className?: string;
  position?: string;
  fit?: 'contain' | 'cover';
  adminProduct?: Product;
  allowDirectUpload?: boolean;
}

function getCategoryFallbackImage(category?: string, productType?: string): string {
  if (
    category === 'gn-pans' ||
    productType === 'gn-pan' ||
    productType === 'gn-lid' ||
    productType === 'ice-cream-pan'
  ) {
    return '/images/products/gn-pan.jpg';
  }
  if (category === 'commercial-kitchen-equipment' || productType === 'equipment') {
    return '/images/products/equipment.jpg';
  }
  return '/images/products/kitchenware.jpg';
}

export function ProductVisual({
  src,
  alt,
  modelNumber,
  isPlaceholder,
  className = '',
  position = '50% 50%',
  fit = 'contain',
  adminProduct,
  allowDirectUpload = false,
}: ProductVisualProps) {
  const { resolveMediaSrc, isAdmin, editMode } = useStore();
  const resolvedSrc = resolveMediaSrc(src);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const fallbackImage = getCategoryFallbackImage(adminProduct?.category, adminProduct?.productType);
  const [currentSrc, setCurrentSrc] = useState<string>(() => resolvedSrc || fallbackImage);
  const [hasFailedCompletely, setHasFailedCompletely] = useState(false);

  useEffect(() => {
    setCurrentSrc(resolvedSrc || fallbackImage);
    setHasFailedCompletely(false);
  }, [resolvedSrc, fallbackImage]);

  const handleImageError = () => {
    if (currentSrc !== fallbackImage) {
      // Seamlessly fallback to category image if custom image fails to load
      setCurrentSrc(fallbackImage);
    } else {
      setHasFailedCompletely(true);
    }
  };

  const canManageImage = Boolean(
    adminProduct && !adminProduct.isPlaceholder && (isAdmin || editMode || allowDirectUpload)
  );

  const isDisplayingImage = Boolean(currentSrc && !hasFailedCompletely);
  const hasCustomLiveImage = Boolean(resolvedSrc && currentSrc === resolvedSrc);

  const handleOpenImageManager = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageModalOpen(true);
  };

  return (
    <div className="relative w-full h-full group">
      {isDisplayingImage ? (
        <div
          className={`w-full h-full bg-[#F5F5F5] flex items-center justify-center ${
            fit === 'cover' ? '' : 'p-3'
          } overflow-hidden ${className}`}
        >
          <img
            src={currentSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={handleImageError}
            style={{
              objectPosition: position,
              objectFit: fit,
            }}
            className={
              fit === 'cover'
                ? 'w-full h-full transition-transform duration-300 group-hover:scale-105'
                : 'max-w-full max-h-full w-auto h-auto transition-transform duration-300 group-hover:scale-105'
            }
          />
        </div>
      ) : (
        <div
          className={`w-full h-full bg-[#F5F5F5] flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
        >
          <div className="w-20 h-20 border border-[#B8B8B3] flex items-center justify-center mb-4 bg-white">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-[#292321]/50"
              aria-hidden="true"
            >
              <rect x="6" y="14" width="36" height="20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6" y1="19" x2="42" y2="19" stroke="currentColor" strokeWidth="1.2" />
              <line x1="14" y1="34" x2="14" y2="38" stroke="currentColor" strokeWidth="1.5" />
              <line x1="34" y1="34" x2="34" y2="38" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-xs font-medium tracking-[0.06em] uppercase text-[#292321]/70">
            {isPlaceholder ? 'Product Image Placeholder' : 'Product Visual'}
          </p>
          {modelNumber && (
            <p className="mt-1 font-mono text-[11px] text-[#292321]/50 tabular-nums">
              {modelNumber}
            </p>
          )}
          {isAdmin && allowDirectUpload && canManageImage && (
            <button
              type="button"
              onClick={handleOpenImageManager}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.06em] hover:bg-black transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
          )}
        </div>
      )}

      {/* Admin Image Management Trigger (Only visible to admin / edit mode) */}
      {(isAdmin || editMode) && canManageImage && (
        <button
          type="button"
          onClick={handleOpenImageManager}
          title="Manage product photograph"
          className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] shadow-sm transition-colors bg-white/95 text-black border border-black hover:bg-[#5B1018] hover:text-white hover:border-[#5B1018]"
        >
          {hasCustomLiveImage ? (
            <>
              <Pencil className="w-3 h-3" />
              <span>Edit Image</span>
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" />
              <span>Upload Photo</span>
            </>
          )}
        </button>
      )}

      {imageModalOpen && adminProduct && (
        <ProductSingleImageModal
          product={adminProduct}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
