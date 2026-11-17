import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pencil,
  Plus,
} from 'lucide-react';
import {
  formatInrPrice,
  type Product,
  type ProductVariant,
} from '../types/catalog';
import { useStore } from '../context/StoreContext';
import { ProductVisual } from '../components/ProductVisual';
import { ProductCard } from '../components/ProductCard';
import { EditableText } from '../components/EditableText';
import { ProductQuickEditModal } from '../components/ProductQuickEditModal';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (path: string) => void;
}

function formatInchesText(val?: string): string | null {
  if (!val || val === '—' || val === 'Contact for Details') return null;
  if (val.includes('"') || val.toLowerCase().includes('in')) return val;
  return `${val} in`;
}

function formatMmText(val?: string): string | null {
  if (!val || val === '—' || val === 'Contact for Details') return null;
  if (val.toLowerCase().includes('mm')) return val;
  return `${val} mm`;
}

function buildVariantNotes(variant: ProductVariant): string | undefined {
  const parts: string[] = [];
  const mm = formatMmText(variant.dimensionsMm);
  const inch = formatInchesText(variant.dimensionsIn);
  if (mm) parts.push(mm);
  else if (inch) parts.push(inch);
  if (variant.capacity) parts.push(variant.capacity);
  if (
    variant.individualWeight &&
    variant.individualWeight !== 'Contact for Details'
  ) {
    parts.push(`Wt: ${variant.individualWeight}`);
  }
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

export function ProductDetailPage({ productId, onNavigate }: ProductDetailPageProps) {
  const {
    products,
    settings,
    addToQuote,
    getWhatsAppUrl,
    getCategoryDisplay,
    isAdmin,
  } = useStore();
  const product = products.find((p) => p.id === productId);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quoteQty, setQuoteQty] = useState(10);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [mobileTableOpen, setMobileTableOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  useEffect(() => {
    setSelectedVariantIdx(0);
    setQuoteQty(10);
    setAddedFeedback(null);
    setMobileTableOpen(false);
    if (product?.variants && product.variants.length > 0) {
      setSelectedSize(product.variants[0].label);
      setSelectedGroup(product.variants[0].variantGroup || '');
    } else if (product?.availableSizes && product.availableSizes.length > 0) {
      setSelectedSize(product.availableSizes[0]);
      setSelectedGroup('');
    } else {
      setSelectedSize(product?.modelNumber || 'Standard');
      setSelectedGroup('');
    }
  }, [productId, product]);

  if (!product) {
    return (
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-20 text-center space-y-5">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]">
          Product Not Found
        </p>
        <h1 className="font-display text-3xl font-semibold text-black">
          The requested product could not be located
        </h1>
        <p className="text-sm text-[#292321]/75 max-w-md mx-auto">
          It may have been updated or removed from the catalogue. Return to our product
          categories to continue browsing.
        </p>
        <div className="pt-2">
          <a
            href="/products"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/products');
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </a>
        </div>
      </div>
    );
  }

  const category = getCategoryDisplay(product.category);
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const activeVariant: ProductVariant | undefined = hasVariants
    ? variants[selectedVariantIdx] ?? variants[0]
    : undefined;

  const variantGroups = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of variants) {
      const g = (v.variantGroup || '').trim();
      if (g && !seen.has(g)) {
        seen.add(g);
        list.push(g);
      }
    }
    return list;
  }, [variants]);

  const activeGroup =
    variantGroups.length > 0
      ? selectedGroup && variantGroups.includes(selectedGroup)
        ? selectedGroup
        : variantGroups[0]
      : '';

  const visibleVariantEntries = useMemo(() => {
    const entries = variants.map((v, idx) => ({ variant: v, idx }));
    if (variantGroups.length > 0 && activeGroup) {
      return entries.filter((e) => (e.variant.variantGroup || '').trim() === activeGroup);
    }
    return entries;
  }, [variants, variantGroups, activeGroup]);

  const hasAnyPrice =
    variants.some((v) => typeof v.netPrice === 'number') &&
    settings.showPrices !== false;
  const hasAnyMm = variants.some(
    (v) => v.dimensionsMm && v.dimensionsMm !== '—'
  );
  const hasAnyIn = variants.some(
    (v) => v.dimensionsIn && v.dimensionsIn !== '—'
  );
  const hasAnyCapacity = variants.some((v) => Boolean(v.capacity));
  const hasAnyIndWeight = variants.some((v) => Boolean(v.individualWeight));
  const hasAnyPkgWeight = variants.some((v) => Boolean(v.packagingWeight));
  const hasAnyPackingQty = variants.some((v) => Boolean(v.packingQty));

  const effectiveModelOrSize = activeVariant
    ? activeVariant.label
    : selectedSize || product.modelNumber || 'Standard';

  const matchingLid = product.matchingLidId
    ? products.find((p) => p.id === product.matchingLidId)
    : undefined;

  const showPrices = settings.showPrices !== false;

  const relatedProducts: Product[] = (() => {
    if (product.relatedProductIds && product.relatedProductIds.length > 0) {
      const explicit = product.relatedProductIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));
      if (explicit.length > 0) return explicit.slice(0, 3);
    }
    return products
      .filter((p) => p.category === product.category && p.id !== product.id && !p.isPlaceholder)
      .slice(0, 3);
  })();

  const handleSelectGroup = (group: string) => {
    setSelectedGroup(group);
    const firstMatchIdx = variants.findIndex(
      (v) => (v.variantGroup || '').trim() === group
    );
    if (firstMatchIdx !== -1) {
      setSelectedVariantIdx(firstMatchIdx);
    }
  };

  const handleSelectVariant = (idx: number) => {
    setSelectedVariantIdx(idx);
    const v = variants[idx];
    if (v?.variantGroup) {
      setSelectedGroup(v.variantGroup);
    }
  };

  const handleEnquireNow = () => {
    const safeQty = Math.max(1, Math.floor(Number(quoteQty) || 1));
    const notes = activeVariant ? buildVariantNotes(activeVariant) : undefined;
    addToQuote({
      productId: product.id,
      category: product.category,
      productName: product.name,
      modelOrSize: effectiveModelOrSize,
      quantity: safeQty,
      ...(notes ? { notes } : {}),
    });
    onNavigate('/quote');
  };

  const handleAddToQuotation = () => {
    const safeQty = Math.max(1, Math.floor(Number(quoteQty) || 1));
    const notes = activeVariant ? buildVariantNotes(activeVariant) : undefined;
    addToQuote({
      productId: product.id,
      category: product.category,
      productName: product.name,
      modelOrSize: effectiveModelOrSize,
      quantity: safeQty,
      ...(notes ? { notes } : {}),
    });
    setAddedFeedback(`${product.name} (${effectiveModelOrSize}) × ${safeQty}`);
  };

  const handleAddMatchingLid = () => {
    if (!matchingLid) return;
    const safeQty = Math.max(1, Math.floor(Number(quoteQty) || 1));
    const lidVariant = matchingLid.variants?.[0];
    const lidNotes = lidVariant ? buildVariantNotes(lidVariant) : undefined;
    addToQuote({
      productId: matchingLid.id,
      category: matchingLid.category,
      productName: matchingLid.name,
      modelOrSize: lidVariant?.label || matchingLid.modelNumber || 'Standard',
      quantity: safeQty,
      ...(lidNotes ? { notes: lidNotes } : {}),
    });
    setAddedFeedback(
      `${matchingLid.name} (${lidVariant?.label || matchingLid.modelNumber}) × ${safeQty}`
    );
  };

  const whatsappMessage = activeVariant
    ? [
        'Hello SHREE DURGA STEELS, I would like to enquire about:',
        `Product: ${product.name}`,
        `Variant / Model: ${activeVariant.label}`,
        formatMmText(activeVariant.dimensionsMm)
          ? `Dimensions (mm): ${formatMmText(activeVariant.dimensionsMm)}`
          : null,
        formatInchesText(activeVariant.dimensionsIn)
          ? `Dimensions (Inches): ${formatInchesText(activeVariant.dimensionsIn)}`
          : null,
        activeVariant.capacity ? `Capacity: ${activeVariant.capacity}` : null,
        activeVariant.individualWeight
          ? `Individual Weight: ${activeVariant.individualWeight}`
          : null,
        `Quantity: ${quoteQty}`,
      ]
        .filter(Boolean)
        .join('\n')
    : `Hello SHREE DURGA STEELS, I would like to enquire about:\nProduct: ${product.name}\nModel Number: ${product.modelNumber || 'N/A'}\nSize / Variant: ${selectedSize || 'Standard'}\nQuantity: ${quoteQty}`;

  const activeMm = activeVariant ? formatMmText(activeVariant.dimensionsMm) : null;
  const activeIn = activeVariant ? formatInchesText(activeVariant.dimensionsIn) : null;

  return (
    <div className="bg-white">
      {/* Breadcrumb Bar */}
      <div className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-4">
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-[#292321]/70 flex flex-wrap items-center gap-2"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="hover:text-black"
            >
              Home
            </a>
            <span aria-hidden="true">/</span>
            <a
              href={`/products/${category.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/products/${category.id}`);
              }}
              className="hover:text-black"
            >
              {category.title}
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-black font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Product Detail Split */}
      <section className="py-12 md:py-16 border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* LEFT SIDE: Single Product Image */}
            <div className="lg:col-span-6 space-y-6">
              <div className="aspect-[4/3] border border-[#B8B8B3]/70 bg-[#F5F5F5] overflow-hidden">
                <ProductVisual
                  src={product.mainImage}
                  alt={product.name}
                  modelNumber={activeVariant?.label || product.modelNumber}
                  isPlaceholder={product.isPlaceholder}
                  position={product.mainImagePosition}
                  fit={product.mainImageFit}
                  adminProduct={product}
                  allowDirectUpload
                />
              </div>

              {/* Matching Lid Recommendation (on GN Pan detail pages) */}
              {matchingLid && (
                <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-[#B8B8B3]/50 pb-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5B1018]">
                        Recommended Matching Cover
                      </p>
                      <h2 className="font-display text-lg font-semibold text-black mt-1">
                        {matchingLid.name}
                      </h2>
                    </div>
                    {matchingLid.variants?.[0] &&
                      typeof matchingLid.variants[0].netPrice === 'number' && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#292321]/65">
                            NET PRICE / PC
                          </p>
                          <p className="font-display text-lg font-semibold text-black tabular-nums">
                            {showPrices
                              ? formatInrPrice(matchingLid.variants[0].netPrice)
                              : 'On Enquiry'}
                          </p>
                        </div>
                      )}
                  </div>

                  <p className="text-xs text-[#292321]/80 leading-relaxed tabular-nums">
                    Dimensions:{' '}
                    <strong className="font-mono text-black">
                      {matchingLid.variants?.[0]?.dimensionsMm || matchingLid.dimensions} mm
                    </strong>
                    {matchingLid.variants?.[0]?.dimensionsIn
                      ? ` (${matchingLid.variants[0].dimensionsIn} in)`
                      : ''}
                    . Precision-fitted stainless steel lid for {product.name}.
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleAddMatchingLid}
                      className="px-4 py-2.5 bg-black text-white text-xs font-semibold tracking-[0.06em] uppercase hover:bg-[#5B1018] transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Matching Lid to Quotation</span>
                    </button>
                    <a
                      href={`/product/${matchingLid.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(`/product/${matchingLid.id}`);
                      }}
                      className="px-4 py-2.5 bg-white border border-black text-black text-xs font-semibold tracking-[0.06em] uppercase hover:bg-[#F5F5F5] transition-colors"
                    >
                      View Lid Details
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Specifications & Enquiry CTAs */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border-b border-[#B8B8B3]/50 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B1018] font-semibold tracking-[0.08em] uppercase">
                    {product.brandLine && (
                      <>
                        <span>{product.brandLine}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{product.subCategory || category.title}</span>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setQuickEditOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11]"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Product &amp; Image</span>
                    </button>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight">
                  {product.name}
                </h1>
                {(activeVariant?.label || product.modelNumber) && (
                  <p className="mt-2 font-mono text-sm text-[#292321]/75 tabular-nums">
                    {hasVariants ? 'Selected Model / Variant: ' : 'Model Number: '}
                    {activeVariant?.label || product.modelNumber}
                  </p>
                )}
                {product.isAvailable === false && (
                  <div className="mt-3 p-3 bg-[#F3E7DA] border border-[#5B1018] text-xs font-semibold uppercase tracking-[0.06em] text-[#5B1018]">
                    Currently Unavailable — Contact Us for Availability &amp; Lead Time
                  </div>
                )}
              </div>

              {product.description && (
                <div>
                  <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-2">
                    Product Overview
                  </h2>
                  <p className="text-sm sm:text-base text-[#292321]/90 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Interactive Variants Selector (GN Pans & Kitchenware Families) */}
              {hasVariants && activeVariant && (
                <div className="space-y-4">
                  {/* Optional Group / Thickness Selector (e.g., Barfi Tray height groups, Chowki & Patta) */}
                  {variantGroups.length > 0 && (
                    <div>
                      <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-2.5">
                        Select Type / Height Group
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {variantGroups.map((group) => {
                          const active = activeGroup === group;
                          return (
                            <button
                              key={group}
                              type="button"
                              onClick={() => handleSelectGroup(group)}
                              className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.05em] border transition-colors ${
                                active
                                  ? 'bg-[#5B1018] text-white border-[#5B1018]'
                                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                              }`}
                            >
                              {group}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Variant / Model Button Selector */}
                  <div>
                    <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-2.5">
                      {product.productType === 'gn-pan'
                        ? 'Select Pan Depth'
                        : product.category === 'kitchenware-home-utility'
                        ? 'Select Model / Variant'
                        : 'Select Size / Variant'}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {visibleVariantEntries.map(({ variant, idx }) => {
                        const active = idx === selectedVariantIdx;
                        const btnLabel =
                          variant.depthMm ||
                          variant.modelCode ||
                          variant.label;
                        return (
                          <button
                            key={variant.label}
                            type="button"
                            onClick={() => handleSelectVariant(idx)}
                            className={`px-3.5 py-2 text-xs font-semibold tabular-nums border transition-colors ${
                              active
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                            }`}
                          >
                            {btnLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Variant Metrics & Price Box */}
                  <div className="bg-[#F5F5F5] border border-[#B8B8B3]/70 p-5 space-y-4">
                    <div className="flex items-baseline justify-between gap-4 border-b border-[#B8B8B3]/50 pb-3">
                      {typeof activeVariant.netPrice === 'number' ? (
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/65">
                            NET PRICE / PC
                          </p>
                          {showPrices ? (
                            <p className="font-display text-2xl sm:text-3xl font-semibold text-black tabular-nums mt-0.5">
                              {formatInrPrice(activeVariant.netPrice)}
                            </p>
                          ) : (
                            <p className="text-sm font-semibold uppercase tracking-[0.06em] text-[#5B1018] mt-1">
                              Available On Enquiry
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/65">
                            Selected Model
                          </p>
                          <p className="font-display text-xl font-semibold text-black tabular-nums mt-0.5">
                            {activeVariant.modelCode || activeVariant.label}
                          </p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/65">
                          Variant Specification
                        </p>
                        <p className="font-mono text-sm font-semibold text-black tabular-nums mt-1">
                          {activeVariant.label}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {activeMm && (
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                            Dimensions (mm)
                          </p>
                          <p className="font-mono text-sm text-black font-medium tabular-nums">
                            {activeMm}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                          {activeMm ? 'Dimensions (Inches)' : 'Dimensions'}
                        </p>
                        <p className="font-mono text-sm text-black font-medium tabular-nums">
                          {activeIn || 'Contact for Details'}
                        </p>
                      </div>

                      {activeVariant.capacity && (
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                            Capacity
                          </p>
                          <p className="font-mono text-sm text-black font-semibold tabular-nums">
                            {activeVariant.capacity}
                          </p>
                        </div>
                      )}

                      {(activeVariant.individualWeight ||
                        product.category === 'kitchenware-home-utility') && (
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                            Individual Weight
                          </p>
                          <p className="font-mono text-sm text-black font-semibold tabular-nums">
                            {activeVariant.individualWeight || 'Contact for Details'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Strictly Separate Packaging Details */}
                    {(activeVariant.packagingWeight ||
                      activeVariant.packingQty ||
                      product.packagingInfo) && (
                      <div className="pt-3 border-t border-[#B8B8B3]/50 space-y-2">
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#5B1018]">
                          Packaging Specifications (Separate from Product Weight)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {activeVariant.packagingWeight && (
                            <div>
                              <span className="text-[#292321]/65 block">
                                Master / Bundle Packaging Weight
                              </span>
                              <span className="font-mono font-semibold text-black tabular-nums">
                                {activeVariant.packagingWeight}
                              </span>
                            </div>
                          )}
                          {activeVariant.packingQty && (
                            <div>
                              <span className="text-[#292321]/65 block">
                                Packing Quantity
                              </span>
                              <span className="font-mono font-semibold text-black tabular-nums">
                                {activeVariant.packingQty}
                              </span>
                            </div>
                          )}
                        </div>
                        {product.packagingInfo && (
                          <p className="text-xs text-[#292321]/80 leading-relaxed">
                            {product.packagingInfo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Full Variant Comparison Table when multiple variants exist */}
                  {variants.length > 1 && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60">
                          All Models, Sizes &amp; Weights ({variants.length})
                        </h2>
                        <button
                          type="button"
                          onClick={() => setMobileTableOpen((prev) => !prev)}
                          className="sm:hidden inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B1018]"
                        >
                          <span>{mobileTableOpen ? 'Hide Table' : 'View All Specs'}</span>
                          {mobileTableOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div
                        className={`border border-[#B8B8B3]/70 overflow-x-auto ${
                          mobileTableOpen ? 'block' : 'hidden sm:block'
                        }`}
                      >
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F5F5F5] border-b border-[#B8B8B3]/70 uppercase tracking-[0.05em]">
                              {variantGroups.length > 0 && (
                                <th className="py-2.5 px-3 font-semibold">Group</th>
                              )}
                              <th className="py-2.5 px-3 font-semibold">Model / Variant</th>
                              {hasAnyMm && (
                                <th className="py-2.5 px-3 font-semibold">Dimensions (mm)</th>
                              )}
                              {hasAnyIn && (
                                <th className="py-2.5 px-3 font-semibold">
                                  {hasAnyMm ? 'Inches' : 'Dimensions (Inches)'}
                                </th>
                              )}
                              {hasAnyCapacity && (
                                <th className="py-2.5 px-3 font-semibold">Capacity</th>
                              )}
                              {hasAnyIndWeight && (
                                <th className="py-2.5 px-3 font-semibold">Ind. Weight</th>
                              )}
                              {hasAnyPkgWeight && (
                                <th className="py-2.5 px-3 font-semibold">Pkg Weight</th>
                              )}
                              {hasAnyPackingQty && (
                                <th className="py-2.5 px-3 font-semibold">Packing Qty</th>
                              )}
                              {hasAnyPrice && (
                                <th className="py-2.5 px-3 font-semibold text-right">
                                  Net Price
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#B8B8B3]/40">
                            {variants.map((v, idx) => {
                              const isSelected = idx === selectedVariantIdx;
                              return (
                                <tr
                                  key={v.label}
                                  onClick={() => handleSelectVariant(idx)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-[#F3E7DA]/70 font-medium text-black'
                                      : 'bg-white hover:bg-[#F5F5F5]'
                                  }`}
                                >
                                  {variantGroups.length > 0 && (
                                    <td className="py-2.5 px-3 font-sans text-[#292321]/80 whitespace-nowrap">
                                      {v.variantGroup || '—'}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                    {v.modelCode || v.label}
                                  </td>
                                  {hasAnyMm && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.dimensionsMm || '—'}
                                    </td>
                                  )}
                                  {hasAnyIn && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.dimensionsIn || 'Contact for Details'}
                                    </td>
                                  )}
                                  {hasAnyCapacity && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.capacity || '—'}
                                    </td>
                                  )}
                                  {hasAnyIndWeight && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.individualWeight || 'Contact for Details'}
                                    </td>
                                  )}
                                  {hasAnyPkgWeight && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.packagingWeight || '—'}
                                    </td>
                                  )}
                                  {hasAnyPackingQty && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                      {v.packingQty || '—'}
                                    </td>
                                  )}
                                  {hasAnyPrice && (
                                    <td className="py-2.5 px-3 font-mono tabular-nums text-right font-semibold text-black whitespace-nowrap">
                                      {typeof v.netPrice === 'number'
                                        ? formatInrPrice(v.netPrice)
                                        : 'On Enquiry'}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Available Sizes Selector (non-variant products) */}
              {!hasVariants &&
                product.availableSizes &&
                product.availableSizes.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-3">
                      Available Sizes
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {product.availableSizes.map((size) => {
                        const active = selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2 text-xs font-medium tabular-nums border transition-colors ${
                              active
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Material, Dimensions & Packaging (for non-variant products) */}
              {!hasVariants &&
                (product.materialDetails || product.dimensions || product.packagingInfo) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F5F5] border border-[#B8B8B3]/60 p-5">
                    {product.materialDetails && (
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                          Material Details
                        </p>
                        <p className="text-sm text-black">{product.materialDetails}</p>
                      </div>
                    )}
                    {product.dimensions && (
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-1">
                          Dimensions
                        </p>
                        <p className="text-sm text-black tabular-nums">
                          {product.dimensions}
                        </p>
                      </div>
                    )}
                    {product.packagingInfo && (
                      <div className="sm:col-span-2 pt-2 border-t border-[#B8B8B3]/40">
                        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#5B1018] mb-1">
                          Packaging Information
                        </p>
                        <p className="text-xs text-[#292321]/85 leading-relaxed">
                          {product.packagingInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Specifications Table */}
              {product.specifications && product.specifications.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]/60 mb-3">
                    Product Specifications
                  </h2>
                  <div className="border border-[#B8B8B3]/70 divide-y divide-[#B8B8B3]/50">
                    {product.specifications.map((spec, idx) => (
                      <div
                        key={`${spec.label}-${idx}`}
                        className="grid grid-cols-12 text-sm"
                      >
                        <div className="col-span-5 bg-[#F5F5F5] px-4 py-3 font-medium text-[#292321] border-r border-[#B8B8B3]/50">
                          {spec.label}
                        </div>
                        <div className="col-span-7 bg-white px-4 py-3 text-black tabular-nums">
                          {spec.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity + CTA Buttons */}
              <div className="pt-4 space-y-3 border-t border-[#B8B8B3]/50">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center border border-[#B8B8B3] bg-white px-3 py-2 sm:w-40 justify-between">
                    <label
                      htmlFor="detail-quote-qty"
                      className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]/70"
                    >
                      Qty
                    </label>
                    <input
                      id="detail-quote-qty"
                      type="number"
                      min={1}
                      value={quoteQty}
                      onChange={(e) =>
                        setQuoteQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-20 text-right text-sm font-mono font-semibold text-black tabular-nums focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToQuotation}
                    className="flex-1 py-3.5 px-6 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <EditableText
                      id="productDetail.cta.addToQuote"
                      defaultText="ADD TO QUOTATION"
                      label="Product Detail Add to Quotation Button"
                      allowDelete={false}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleEnquireNow}
                    className="w-full py-3.5 px-6 bg-white text-black border border-black text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#F5F5F5] transition-colors"
                  >
                    <EditableText
                      id="productDetail.cta.enquireNow"
                      defaultText="ENQUIRE NOW"
                      label="Product Detail Enquire Now Button"
                      allowDelete={false}
                    />
                  </button>
                  <a
                    href={getWhatsAppUrl(whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-6 bg-black text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#292321] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <EditableText
                      id="productDetail.cta.whatsapp"
                      defaultText="WHATSAPP ENQUIRY"
                      label="Product Detail WhatsApp Button"
                      allowDelete={false}
                    />
                  </a>
                </div>

                {addedFeedback && (
                  <div className="p-4 bg-[#F3E7DA] border border-[#D8BFA8] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-[#292321] font-medium">
                      <Check className="w-4 h-4 text-[#5B1018] shrink-0" />
                      <span>Added to your quotation list: {addedFeedback}.</span>
                    </div>
                    <a
                      href="/quote"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/quote');
                      }}
                      className="text-xs font-semibold tracking-[0.06em] uppercase text-[#5B1018] hover:underline whitespace-nowrap"
                    >
                      Open Quote Form
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-[#F5F5F5]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
            <EditableText
              id="productDetail.related.heading"
              defaultText="Related Products"
              label="Related Products Heading"
              as="h2"
              className="font-display text-2xl font-semibold text-black mb-8"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {quickEditOpen && (
        <ProductQuickEditModal
          product={product}
          onClose={() => setQuickEditOpen(false)}
        />
      )}
    </div>
  );
}
