import { useState } from 'react';
import {
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
import type { MediaUsage, Product, ProductSpecification } from '../types/catalog';
import { ImageLibraryModal } from './ImageLibraryModal';
import { ProductVisual } from './ProductVisual';

interface ProductQuickEditModalProps {
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

export function ProductQuickEditModal({
  product,
  onClose,
}: ProductQuickEditModalProps) {
  const { realProducts } = useStore();
  const usage = getUsageForCategory(product.category);
  const existingFirestoreDoc = realProducts.find((p) => p.id === product.id);

  const [name, setName] = useState(product.name);
  const [modelNumber, setModelNumber] = useState(product.modelNumber || '');
  const [subCategory, setSubCategory] = useState(product.subCategory || '');
  const [description, setDescription] = useState(product.description || '');
  const [dimensions, setDimensions] = useState(product.dimensions || '');
  const [materialDetails, setMaterialDetails] = useState(
    product.materialDetails || ''
  );
  const [packagingInfo, setPackagingInfo] = useState(product.packagingInfo || '');
  const [isAvailable, setIsAvailable] = useState(product.isAvailable !== false);
  const [specs, setSpecs] = useState<ProductSpecification[]>(
    product.specifications && product.specifications.length > 0
      ? product.specifications.map((s) => ({ ...s }))
      : []
  );

  const [mainImage, setMainImage] = useState(product.mainImage || '');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string>('');
  const initPos = parsePositionXY(product.mainImagePosition);
  const [posX, setPosX] = useState(initPos.x);
  const [posY, setPosY] = useState(initPos.y);
  const [mainImageFit, setMainImageFit] = useState<'contain' | 'cover'>(
    product.mainImageFit || 'contain'
  );

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePreviewSrc = stagedPreviewUrl || mainImage;

  const handleStageImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingFile(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const compressed = await compressImagePreserveRatio(file);
      setStagedFile(file);
      setStagedPreviewUrl(compressed.dataUrl);
      setShowPreview(true);
      setStatusMessage(
        'Preview ready. Inspect the image above, then click SAVE or PUBLISH to save it permanently.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to prepare product image preview.'
      );
    } finally {
      setProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = () => {
    setStagedFile(null);
    setStagedPreviewUrl('');
    setMainImage('');
    setStatusMessage(
      'Image cleared in editor. Click SAVE or PUBLISH to permanently remove it from this product.'
    );
  };

  const persistProduct = async (actionLabel: 'SAVE' | 'PUBLISH') => {
    if (!name.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      let finalMainImage = mainImage.trim();
      if (stagedFile) {
        const res = await uploadImageAssetToFirestore({
          file: stagedFile,
          usage,
          name: `${name.trim() || product.name} Photo`,
        });
        finalMainImage = res.refUrl;
        setMainImage(res.refUrl);
        setStagedFile(null);
        setStagedPreviewUrl('');
      }

      const updatedProduct: Product = {
        ...product,
        name: name.trim(),
        subCategory: subCategory.trim() || undefined,
        modelNumber: modelNumber.trim(),
        mainImage: finalMainImage || undefined,
        mainImagePosition: `${posX}% ${posY}%`,
        mainImageFit,
        additionalImages: undefined,
        description: description.trim(),
        dimensions: dimensions.trim() || undefined,
        materialDetails: materialDetails.trim() || undefined,
        specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
        packagingInfo: packagingInfo.trim() || undefined,
        isAvailable,
      };

      await saveProductRecordToFirestore(updatedProduct, existingFirestoreDoc);
      setStatusMessage(
        actionLabel === 'PUBLISH'
          ? `Published "${name.trim()}" permanently to live catalogue.`
          : `Saved "${name.trim()}" permanently across devices.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save product changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white border border-black max-w-4xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#B8B8B3]/60 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
              Product Content &amp; Image Manager
            </p>
            <h2 className="font-display text-xl font-semibold text-black">
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
            aria-label="Close product editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Single Product Photograph */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.06em]">
                Product Photograph (1 Image per Product)
              </label>
              <div className="aspect-[4/3] border border-[#B8B8B3] bg-[#F5F5F5] overflow-hidden">
                <ProductVisual
                  src={activePreviewSrc}
                  alt={name || product.name}
                  modelNumber={modelNumber}
                  position={`${posX}% ${posY}%`}
                  fit={mainImageFit}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {!activePreviewSrc ? (
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>{processingFile ? 'Preparing...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={processingFile || saving}
                      onChange={handleStageImageFile}
                      className="sr-only"
                    />
                  </label>
                ) : (
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer">
                    <RefreshCw className="w-3 h-3" />
                    <span>{processingFile ? 'Preparing...' : 'Replace Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={processingFile || saving}
                      onChange={handleStageImageFile}
                      className="sr-only"
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-black bg-white text-black text-[11px] font-semibold uppercase hover:bg-[#F5F5F5]"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Library</span>
                </button>

                {activePreviewSrc && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#5B1018] text-[#5B1018] text-[11px] font-semibold uppercase hover:bg-[#F3E7DA]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {/* Adjust Image Position */}
              <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-black">
                  Adjust Image Position
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
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
                </div>
                <select
                  value={mainImageFit}
                  onChange={(e) =>
                    setMainImageFit(e.target.value as 'contain' | 'cover')
                  }
                  className="w-full px-2.5 py-1.5 border border-[#B8B8B3] bg-white text-xs"
                >
                  <option value="contain">Show Full Product (Contain)</option>
                  <option value="cover">Fill Container (Cover)</option>
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT: Text & Specifications */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Model Number
                </label>
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm font-mono focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Sub-Category
                </label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Dimensions
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                Product Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Material Details
                </label>
                <input
                  type="text"
                  value={materialDetails}
                  onChange={(e) => setMaterialDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1">
                  Packaging Information
                </label>
                <input
                  type="text"
                  value={packagingInfo}
                  onChange={(e) => setPackagingInfo(e.target.value)}
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Specifications Table Editor */}
            <div className="space-y-2 pt-2 border-t border-[#B8B8B3]/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.06em]">
                  Specifications ({specs.length})
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSpecs((prev) => [...prev, { label: '', value: '' }])
                  }
                  className="text-xs font-semibold uppercase text-[#5B1018] hover:underline"
                >
                  + Add Specification
                </button>
              </div>
              {specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, label: e.target.value } : row
                        )
                      )
                    }
                    placeholder="Label"
                    className="col-span-5 px-2.5 py-1.5 border border-[#B8B8B3] text-xs"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, value: e.target.value } : row
                        )
                      )
                    }
                    placeholder="Value"
                    className="col-span-6 px-2.5 py-1.5 border border-[#B8B8B3] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSpecs((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="col-span-1 text-xs text-[#5B1018] font-bold"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-black pt-1">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
              />
              <span>Available for Ordering</span>
            </label>
          </div>
        </div>

        {/* Preview Summary Box */}
        {showPreview && (
          <div className="border border-black bg-[#F5F5F5] p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
              Live Product Card &amp; Detail Preview (Before Publishing)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 aspect-[4/3] border border-[#B8B8B3] bg-white overflow-hidden">
                <ProductVisual
                  src={activePreviewSrc}
                  alt={name || product.name}
                  modelNumber={modelNumber}
                  position={`${posX}% ${posY}%`}
                  fit={mainImageFit}
                />
              </div>
              <div className="sm:col-span-7 space-y-1.5">
                <p className="font-display text-lg font-semibold text-black">{name}</p>
                <p className="text-xs font-mono text-[#292321]/75">
                  {modelNumber} · {subCategory} · {dimensions || 'Standard'}
                </p>
                <p className="text-xs text-[#292321]/90">{description}</p>
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

        {/* Action Buttons: SAVE, CANCEL, PREVIEW, PUBLISH */}
        <div className="pt-3 border-t border-[#B8B8B3]/60 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
          >
            CANCEL
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'HIDE PREVIEW' : 'PREVIEW'}</span>
            </button>
            <button
              type="button"
              disabled={saving || processingFile}
              onClick={() => persistProduct('SAVE')}
              className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
            <button
              type="button"
              disabled={saving || processingFile}
              onClick={() => persistProduct('PUBLISH')}
              className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
            >
              PUBLISH
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
          setMainImage(refUrl);
          setStatusMessage(
            'Image selected from library. Click SAVE or PUBLISH to confirm.'
          );
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );
}
