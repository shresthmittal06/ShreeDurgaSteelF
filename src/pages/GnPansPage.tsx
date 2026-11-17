import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, MessageCircle, Plus } from 'lucide-react';
import {
  formatInrPrice,
  type Product,
  type ProductVariant,
} from '../types/catalog';
import { GN_DEPTH_OPTIONS, GN_SIZE_OPTIONS } from '../data/gnPansCatalog';
import { useStore } from '../context/StoreContext';
import { ProductVisual } from '../components/ProductVisual';
import { EditableText } from '../components/EditableText';

interface GnPansPageProps {
  onNavigate: (path: string) => void;
}

type ProductTypeFilter = 'all' | 'gn-pan' | 'gn-lid' | 'ice-cream-pan';

interface GnPanCardProps {
  product: Product;
  forcedDepth?: string;
  showPrices: boolean;
  onNavigate: (path: string) => void;
  onAddToQuotation: (product: Product, variant: ProductVariant, qty: number) => void;
  onEnquireNow: (product: Product, variant: ProductVariant, qty: number) => void;
}

function GnPanCard({
  product,
  forcedDepth,
  showPrices,
  onNavigate,
  onAddToQuotation,
  onEnquireNow,
}: GnPanCardProps) {
  const { getWhatsAppUrl } = useStore();
  const variants = product.variants || [];
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (forcedDepth && forcedDepth !== 'all') {
      const idx = variants.findIndex((v) => v.depthMm === forcedDepth);
      if (idx !== -1) {
        setSelectedIdx(idx);
      }
    } else if (selectedIdx >= variants.length) {
      setSelectedIdx(0);
    }
  }, [forcedDepth, variants, selectedIdx]);

  const activeVariant: ProductVariant = variants[selectedIdx] || {
    label: product.modelNumber || product.name,
    dimensionsMm: product.dimensions || '—',
    dimensionsIn: '—',
    netPrice: 0,
  };

  const detailPath = `/product/${product.id}`;

  const whatsappMessage = [
    'Hello SHREE DURGA STEELS, I would like to get a quote for:',
    `Product: ${product.name}`,
    activeVariant.label ? `Variant / Size: ${activeVariant.label}` : null,
    activeVariant.dimensionsMm ? `Dimensions: ${activeVariant.dimensionsMm} mm` : null,
    activeVariant.capacity ? `Capacity: ${activeVariant.capacity}` : null,
    typeof activeVariant.netPrice === 'number' && showPrices
      ? `Price: ${formatInrPrice(activeVariant.netPrice)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <article
      id={`section-${product.id}`}
      className="bg-white border border-[#B8B8B3]/80 flex flex-col justify-between transition-colors hover:border-black"
    >
      <div>
        <a
          href={detailPath}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(detailPath);
          }}
          className="block aspect-[4/3] bg-[#F5F5F5] border-b border-[#B8B8B3]/50 overflow-hidden"
        >
          <ProductVisual
            src={product.mainImage}
            alt={product.name}
            modelNumber={activeVariant.label}
            position={product.mainImagePosition}
            fit={product.mainImageFit}
            adminProduct={product}
          />
        </a>

        <div className="p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[#5B1018]">
              {product.gnSize ? `GN Size ${product.gnSize}` : product.subCategory}
            </p>
            <p className="font-mono text-xs text-[#292321]/70 tabular-nums">
              {activeVariant.label}
            </p>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold text-black">
              <a
                href={detailPath}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(detailPath);
                }}
                className="hover:text-[#5B1018] transition-colors"
              >
                {product.name}
              </a>
            </h3>
            {product.dimensions && (
              <p className="text-xs text-[#292321]/70 mt-1 tabular-nums">
                Overall Footprint: {product.dimensions}
              </p>
            )}
          </div>

          {/* Interactive Depth Selector */}
          {variants.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]/65 mb-2">
                Select Depth
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {variants.map((v, idx) => {
                  const active = idx === selectedIdx;
                  return (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`py-2 px-2 text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                      }`}
                    >
                      {v.depthMm || v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Spec Summary */}
          <dl className="border-t border-b border-[#B8B8B3]/40 py-3 space-y-2 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[#292321]/65">Dimensions (mm)</dt>
              <dd className="font-mono text-black font-medium tabular-nums text-right">
                {activeVariant.dimensionsMm
                  ? `${activeVariant.dimensionsMm} mm`
                  : 'Contact for Details'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[#292321]/65">Dimensions (Inches)</dt>
              <dd className="font-mono text-[#292321] tabular-nums text-right">
                {activeVariant.dimensionsIn
                  ? `${activeVariant.dimensionsIn}${activeVariant.dimensionsIn.includes('"') ? '' : ' in'}`
                  : 'Contact for Details'}
              </dd>
            </div>
            {activeVariant.capacity && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#292321]/65">Capacity</dt>
                <dd className="font-mono text-black font-semibold tabular-nums text-right">
                  {activeVariant.capacity}
                </dd>
              </div>
            )}
          </dl>

          {/* Net Price / Pc */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/70">
              NET PRICE / PC
            </span>
            {showPrices && typeof activeVariant.netPrice === 'number' ? (
              <span className="font-display text-xl font-semibold text-black tabular-nums">
                {formatInrPrice(activeVariant.netPrice)}
              </span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B1018]">
                On Enquiry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-6 pb-6 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={detailPath}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(detailPath);
            }}
            className="py-2.5 px-3 border border-black bg-white text-black text-[11px] font-semibold tracking-[0.06em] uppercase text-center hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
          >
            View Details
          </a>
          <a
            href={getWhatsAppUrl(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-2 bg-[#5B1018] text-white text-[10px] xl:text-[11px] font-semibold tracking-[0.04em] uppercase text-center hover:bg-[#430b11] transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Quote on WhatsApp</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export function GnPansPage({ onNavigate }: GnPansPageProps) {
  const { products, settings, quoteItems, addToQuote, getWhatsAppUrl } = useStore();
  const [gnSizeFilter, setGnSizeFilter] = useState<string>('all');
  const [depthFilter, setDepthFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ProductTypeFilter>('all');

  const gnProducts = useMemo(
    () => products.filter((p) => p.category === 'gn-pans' && !p.isPlaceholder),
    [products]
  );

  const gnPans = useMemo(() => {
    return gnProducts.filter((p) => {
      if (p.productType !== 'gn-pan') return false;
      if (typeFilter !== 'all' && typeFilter !== 'gn-pan') return false;
      if (gnSizeFilter !== 'all' && p.gnSize !== gnSizeFilter) return false;
      if (depthFilter !== 'all') {
        const hasDepth = (p.variants || []).some((v) => v.depthMm === depthFilter);
        if (!hasDepth) return false;
      }
      return true;
    });
  }, [gnProducts, typeFilter, gnSizeFilter, depthFilter]);

  const gnLids = useMemo(() => {
    return gnProducts.filter((p) => {
      if (p.productType !== 'gn-lid') return false;
      if (typeFilter !== 'all' && typeFilter !== 'gn-lid') return false;
      if (gnSizeFilter !== 'all' && p.gnSize !== gnSizeFilter) return false;
      if (depthFilter !== 'all' && typeFilter !== 'gn-lid') return false;
      return true;
    });
  }, [gnProducts, typeFilter, gnSizeFilter, depthFilter]);

  const iceCreamPans = useMemo(() => {
    return gnProducts.filter((p) => {
      if (p.productType !== 'ice-cream-pan') return false;
      if (typeFilter !== 'all' && typeFilter !== 'ice-cream-pan') return false;
      if (gnSizeFilter !== 'all') return false;
      if (depthFilter !== 'all') {
        const hasDepth = (p.variants || []).some((v) => v.depthMm === depthFilter);
        if (!hasDepth) return false;
      }
      return true;
    });
  }, [gnProducts, typeFilter, gnSizeFilter, depthFilter]);

  const handleAddToQuotation = (
    product: Product,
    variant: ProductVariant,
    qty: number
  ) => {
    addToQuote({
      productId: product.id,
      category: 'gn-pans',
      productName: product.name,
      modelOrSize: variant.label,
      quantity: qty,
      notes: `${variant.dimensionsMm} mm${
        variant.capacity ? ` | ${variant.capacity}` : ''
      }`,
    });
  };

  const handleEnquireNow = (
    product: Product,
    variant: ProductVariant,
    qty: number
  ) => {
    handleAddToQuotation(product, variant, qty);
    onNavigate('/quote');
  };

  const jumpToSubsection = (targetType: ProductTypeFilter, targetSize = 'all') => {
    setTypeFilter(targetType);
    setGnSizeFilter(targetSize);
    setDepthFilter('all');
  };

  const showPrices = settings.showPrices !== false;
  const totalVisible = gnPans.length + gnLids.length + iceCreamPans.length;

  return (
    <div className="bg-white min-h-[75vh]">
      {/* Page Heading */}
      <section className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 py-12 md:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-[#292321]/65 mb-4 flex items-center gap-2"
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
              href="/products"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/products');
              }}
              className="hover:text-black"
            >
              Products
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-black font-medium">GN Pans &amp; Accessories</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-3">
              <EditableText
                id="gnpans.header.eyebrow"
                defaultText="Precision-Fit Storage. Professional Kitchen Performance."
                label="GN Pans Page Tagline"
                as="p"
                className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]"
              />
              <EditableText
                id="gnpans.header.heading"
                defaultText="GN PANS & ACCESSORIES"
                label="GN Pans Page Heading"
                as="h1"
                allowDelete={false}
                className="font-display text-3xl md:text-4xl font-semibold text-black tracking-tight uppercase"
              />
              <EditableText
                id="gnpans.header.description"
                defaultText="Explore our comprehensive range of stainless steel GN pans and accessories, available in multiple gastronorm sizes and depths to meet the requirements of professional kitchens."
                label="GN Pans Page Description"
                as="p"
                multiline
                allowExtraParagraphs
                className="text-base text-[#292321]/80 leading-relaxed max-w-2xl"
              />
            </div>

            <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
              <a
                href={getWhatsAppUrl(
                  'Hello SHREE DURGA STEELS, I would like to request a quotation for GN Pans & Accessories.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  <EditableText
                    id="gnpans.header.cta"
                    defaultText="Get Quote on WhatsApp"
                    label="GN Pans Quote CTA Button"
                    allowDelete={false}
                  />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Subcategory Index */}
      <section className="bg-white border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-5">
          {/* Quick Subcategory Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/60 mr-1">
              Subcategories:
            </span>
            <button
              type="button"
              onClick={() => jumpToSubsection('all', 'all')}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap ${
                typeFilter === 'all' && gnSizeFilter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
              }`}
            >
              All GN Range
            </button>
            {GN_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => jumpToSubsection('gn-pan', size)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                  typeFilter === 'gn-pan' && gnSizeFilter === size
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                }`}
              >
                GN Pan {size}
              </button>
            ))}
            <button
              type="button"
              onClick={() => jumpToSubsection('gn-lid', 'all')}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                typeFilter === 'gn-lid'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
              }`}
            >
              GN Pan Covers
            </button>
            <button
              type="button"
              onClick={() => jumpToSubsection('ice-cream-pan', 'all')}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                typeFilter === 'ice-cream-pan'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
              }`}
            >
              Ice Cream Pans With Lids
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16 space-y-16">
        {totalVisible === 0 && (
          <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-12 text-center space-y-4">
            <p className="font-display text-lg font-semibold text-black">
              No matching GN Pan size or depth combination
            </p>
            <p className="text-sm text-[#292321]/75 max-w-md mx-auto">
              Only supplied gastronorm sizes and depths are displayed (for example, GN
              Pan 1/9 is available in 65 MM, 100 MM, and 150 MM depths).
            </p>
            <button
              type="button"
              onClick={() => jumpToSubsection('all', 'all')}
              className="px-6 py-2.5 bg-black text-white text-xs font-semibold tracking-[0.08em] uppercase"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* SUBSECTION 1: GN PANS BY STANDARD GASTRONORM SIZE */}
        {gnPans.length > 0 && (
          <section aria-labelledby="gn-pans-heading">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 mb-8 border-b border-[#B8B8B3]/60">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-1">
                  Standard Gastronorm Containers
                </p>
                <h2
                  id="gn-pans-heading"
                  className="font-display text-2xl font-semibold text-black"
                >
                  Stainless Steel GN Pans ({gnPans.length})
                </h2>
              </div>
              <p className="text-xs text-[#292321]/70">
                Select a depth on any card to update dimensions, capacity, and price
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gnPans.map((pan) => (
                <GnPanCard
                  key={pan.id}
                  product={pan}
                  forcedDepth={depthFilter}
                  showPrices={showPrices}
                  onNavigate={onNavigate}
                  onAddToQuotation={handleAddToQuotation}
                  onEnquireNow={handleEnquireNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* SUBSECTION 2: GN PAN COVERS */}
        {gnLids.length > 0 && (
          <section aria-labelledby="gn-covers-heading">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 mb-8 border-b border-[#B8B8B3]/60">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-1">
                  Matching Stainless Steel Lids
                </p>
                <h2
                  id="gn-covers-heading"
                  className="font-display text-2xl font-semibold text-black uppercase"
                >
                  GN PAN COVERS ({gnLids.length})
                </h2>
              </div>
              <p className="text-xs text-[#292321]/70">
                Fitted covers matched to standard GN footprints
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gnLids.map((lid) => (
                <GnPanCard
                  key={lid.id}
                  product={lid}
                  showPrices={showPrices}
                  onNavigate={onNavigate}
                  onAddToQuotation={handleAddToQuotation}
                  onEnquireNow={handleEnquireNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* SUBSECTION 3: ICE CREAM PANS WITH LID */}
        {iceCreamPans.length > 0 && (
          <section aria-labelledby="ice-cream-heading">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 mb-8 border-b border-[#B8B8B3]/60">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-1">
                  Supplied Complete With Fitted Lids
                </p>
                <h2
                  id="ice-cream-heading"
                  className="font-display text-2xl font-semibold text-black uppercase"
                >
                  ICE CREAM PANS WITH LID ({iceCreamPans.length})
                </h2>
              </div>
              <p className="text-xs text-[#292321]/70">
                Each pan is supplied complete with matching lid
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {iceCreamPans.map((icp) => (
                <GnPanCard
                  key={icp.id}
                  product={icp}
                  forcedDepth={depthFilter}
                  showPrices={showPrices}
                  onNavigate={onNavigate}
                  onAddToQuotation={handleAddToQuotation}
                  onEnquireNow={handleEnquireNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* B2B Bulk Quotation Summary Bar */}
        {quoteItems.length > 0 && (
          <section className="border border-black bg-[#F5F5F5] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-1">
                Active B2B Quotation List
              </p>
              <p className="font-display text-xl font-semibold text-black">
                {quoteItems.length}{' '}
                {quoteItems.length === 1 ? 'line item' : 'line items'} selected for
                quotation
              </p>
              <p className="text-xs text-[#292321]/75 mt-1">
                Review quantities, add more sizes or lids, and submit one bulk enquiry.
              </p>
            </div>
            <a
              href="/quote"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/quote');
              }}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Review &amp; Submit Quotation</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
