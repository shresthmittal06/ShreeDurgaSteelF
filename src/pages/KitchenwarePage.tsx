import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, MessageCircle, Search } from 'lucide-react';
import {
  KITCHENWARE_FILTER_TYPES,
  KITCHENWARE_SUBCATEGORIES,
} from '../data/kitchenwareCatalog';
import { useStore } from '../context/StoreContext';
import type { KitchenwareFilterTag, Product } from '../types/catalog';
import { ProductVisual } from '../components/ProductVisual';
import { EditableText } from '../components/EditableText';

interface KitchenwarePageProps {
  onNavigate: (path: string) => void;
}

type TypeFilterValue = 'all' | KitchenwareFilterTag;

interface KitchenwareCardProps {
  product: Product;
  onNavigate: (path: string) => void;
  onEnquireNow: (product: Product) => void;
}

function getWeightRangeLabel(product: Product): string | null {
  const variants = product.variants || [];
  const weights = variants
    .map((v) => v.individualWeight?.trim())
    .filter((w): w is string => Boolean(w) && w !== 'Contact for Details');
  if (weights.length === 0) return null;
  if (weights.length === 1) return weights[0];
  return `${weights[0]} – ${weights[weights.length - 1]}`;
}

function KitchenwareCard({
  product,
  onNavigate,
  onEnquireNow,
}: KitchenwareCardProps) {
  const { getWhatsAppUrl } = useStore();
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const detailPath = `/product/${product.id}`;
  const variants = product.variants || [];

  const whatsappMessage = [
    'Hello SHREE DURGA STEELS, I would like to get a quote for:',
    `Product: ${product.name}`,
    product.modelNumber ? `Model: ${product.modelNumber}` : null,
    product.dimensions ? `Dimensions: ${product.dimensions}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const uniqueModels = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of variants) {
      const code = (v.modelCode || v.label).trim();
      if (code && !seen.has(code)) {
        seen.add(code);
        list.push(code);
      }
    }
    return list;
  }, [variants]);

  const weightLabel = getWeightRangeLabel(product);
  const hasDimensions =
    Boolean(product.dimensions) && product.dimensions !== 'Contact for Details';

  return (
    <article className="bg-white border border-[#B8B8B3]/80 flex flex-col justify-between transition-colors hover:border-black">
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
            modelNumber={product.modelNumber}
            position={product.mainImagePosition}
            fit={product.mainImageFit}
            adminProduct={product}
          />
        </a>

        <div className="p-3.5 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-1.5 text-[11px] sm:text-xs">
            <span className="font-semibold tracking-[0.06em] uppercase text-[#5B1018] truncate">
              {product.subCategory || 'Kitchenware'}
            </span>
            {product.modelNumber && (
              <span className="font-mono text-[#292321]/75 tabular-nums">
                {product.modelNumber}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-display text-base sm:text-xl font-semibold text-black leading-snug">
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
            {product.isAvailable === false && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B1018]">
                Currently Unavailable — Contact for Lead Time
              </p>
            )}
          </div>

          {/* Mobile Expandable Toggle for Dense Specs */}
          <button
            type="button"
            onClick={() => setSpecsExpanded((prev) => !prev)}
            className="sm:hidden w-full flex items-center justify-between py-1.5 border-t border-b border-[#F5F5F5] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#292321]"
          >
            <span>Specifications</span>
            {specsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <dl
            className={`border-t border-[#B8B8B3]/40 pt-3 space-y-2 text-[11px] sm:text-xs ${
              specsExpanded ? 'block' : 'hidden sm:block'
            }`}
          >
            {uniqueModels.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                <dt className="text-[#292321]/65 shrink-0">Available Models</dt>
                <dd className="font-mono text-black font-medium tabular-nums sm:text-right">
                  {uniqueModels.length > 5
                    ? `${uniqueModels[0]} – ${uniqueModels[uniqueModels.length - 1]} (${uniqueModels.length})`
                    : uniqueModels.join(', ')}
                </dd>
              </div>
            )}

            {product.availableSizes && product.availableSizes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                <dt className="text-[#292321]/65 shrink-0">Available Variants</dt>
                <dd className="text-[#292321] tabular-nums sm:text-right">
                  {variants.length > 1
                    ? `${variants.length} Options`
                    : product.availableSizes.join(', ')}
                </dd>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
              <dt className="text-[#292321]/65 shrink-0">Dimensions</dt>
              <dd className="font-mono text-black tabular-nums sm:text-right">
                {hasDimensions ? product.dimensions : 'Contact for Details'}
              </dd>
            </div>

            {weightLabel && (
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                <dt className="text-[#292321]/65 shrink-0">Individual Weight</dt>
                <dd className="font-mono text-black font-medium tabular-nums sm:text-right">
                  {weightLabel}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-3.5 sm:px-6 pb-3.5 sm:pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
    </article>
  );
}

export function KitchenwarePage({ onNavigate }: KitchenwarePageProps) {
  const { products, quoteItems, addToQuote, getWhatsAppUrl } = useStore();
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');

  const kitchenwareProducts = useMemo(
    () =>
      products.filter(
        (p) => p.category === 'kitchenware-home-utility' && !p.isPlaceholder
      ),
    [products]
  );

  // Collect all unique supplied sizes and models for the filter dropdowns
  const availableDimensionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of kitchenwareProducts) {
      for (const v of p.variants || []) {
        const d = (v.dimensionsIn || v.dimensionsMm || '').trim();
        if (d && d !== 'Contact for Details' && d !== '—') {
          set.add(d);
        }
      }
    }
    return Array.from(set);
  }, [kitchenwareProducts]);

  const availableModelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of kitchenwareProducts) {
      for (const v of p.variants || []) {
        const m = (v.modelCode || '').trim();
        if (m) set.add(m);
      }
    }
    return Array.from(set);
  }, [kitchenwareProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return kitchenwareProducts.filter((p) => {
      if (subCategoryFilter !== 'all' && p.subCategory !== subCategoryFilter) {
        return false;
      }
      if (typeFilter !== 'all') {
        const tags = p.filterTags || [];
        if (!tags.includes(typeFilter)) return false;
      }
      if (sizeFilter !== 'all') {
        const hasSize = (p.variants || []).some(
          (v) =>
            v.dimensionsIn?.trim() === sizeFilter ||
            v.dimensionsMm?.trim() === sizeFilter
        );
        if (!hasSize) return false;
      }
      if (modelFilter !== 'all') {
        const hasModel = (p.variants || []).some(
          (v) =>
            (v.modelCode || v.label).trim() === modelFilter ||
            v.label.includes(modelFilter)
        );
        if (!hasModel) return false;
      }
      if (!q) return true;
      const inName = p.name.toLowerCase().includes(q);
      const inSub = (p.subCategory || '').toLowerCase().includes(q);
      const inModel = p.modelNumber.toLowerCase().includes(q);
      const inDesc = p.description.toLowerCase().includes(q);
      const inVariants = (p.variants || []).some(
        (v) =>
          v.label.toLowerCase().includes(q) ||
          (v.modelCode || '').toLowerCase().includes(q) ||
          (v.dimensionsIn || '').toLowerCase().includes(q)
      );
      return inName || inSub || inModel || inDesc || inVariants;
    });
  }, [
    kitchenwareProducts,
    subCategoryFilter,
    typeFilter,
    sizeFilter,
    modelFilter,
    searchTerm,
  ]);

  // Group filtered products by the 4 defined sections
  const groupedSections = useMemo(() => {
    const ordered: { title: string; items: Product[] }[] = [];
    for (const sub of KITCHENWARE_SUBCATEGORIES) {
      const items = filteredProducts.filter((p) => p.subCategory === sub);
      if (items.length > 0) ordered.push({ title: sub, items });
    }
    const extras = filteredProducts.filter(
      (p) =>
        !KITCHENWARE_SUBCATEGORIES.includes(
          (p.subCategory || '') as (typeof KITCHENWARE_SUBCATEGORIES)[number]
        )
    );
    if (extras.length > 0) {
      ordered.push({ title: 'Additional Kitchenware Products', items: extras });
    }
    return ordered;
  }, [filteredProducts]);

  const handleEnquireNow = (product: Product) => {
    const firstVariant = product.variants?.[0];
    addToQuote({
      productId: product.id,
      category: 'kitchenware-home-utility',
      productName: product.name,
      modelOrSize: firstVariant?.label || product.modelNumber || 'Standard',
      quantity: 10,
      ...(firstVariant?.dimensionsIn &&
      firstVariant.dimensionsIn !== 'Contact for Details'
        ? { notes: `Dimensions: ${firstVariant.dimensionsIn}` }
        : {}),
    });
    onNavigate('/quote');
  };

  const resetAllFilters = () => {
    setTypeFilter('all');
    setSubCategoryFilter('all');
    setSearchTerm('');
    setSizeFilter('all');
    setModelFilter('all');
  };

  const hasActiveFilter =
    typeFilter !== 'all' ||
    subCategoryFilter !== 'all' ||
    searchTerm.trim() !== '' ||
    sizeFilter !== 'all' ||
    modelFilter !== 'all';

  return (
    <div className="bg-white min-h-[75vh]">
      {/* Page Header */}
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
            <span className="text-black font-medium">
              Kitchenware &amp; Home Utility
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-3">
              <EditableText
                id="kitchenware.header.eyebrow"
                defaultText="Mithai Trays · Storage · Pooja & Home Utility"
                label="Kitchenware Page Tagline"
                as="p"
                className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]"
              />
              <EditableText
                id="kitchenware.header.heading"
                defaultText="KITCHENWARE & HOME UTILITY"
                label="Kitchenware Page Heading"
                as="h1"
                allowDelete={false}
                className="font-display text-3xl md:text-4xl font-semibold text-black tracking-tight uppercase"
              />
              <EditableText
                id="kitchenware.header.description"
                defaultText="Stainless steel trays, sweet shop equipment, domestic and commercial masal danis, storage accessories, pooja products, and special utility items offered across multiple sizes, models, and specifications for B2B buyers, sweet shops, caterers, and wholesale dealers."
                label="Kitchenware Page Description"
                as="p"
                multiline
                allowExtraParagraphs
                className="text-base text-[#292321]/80 leading-relaxed max-w-2xl"
              />
            </div>

            <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
              <a
                href={getWhatsAppUrl(
                  'Hello SHREE DURGA STEELS, I would like to request a quotation for Kitchenware & Home Utility products.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  <EditableText
                    id="kitchenware.header.cta"
                    defaultText="Get Quote on WhatsApp"
                    label="Kitchenware Quote CTA Button"
                    allowDelete={false}
                  />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Product Family Navigation & Combined 4-Axis Filters */}
      <section className="bg-white border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-5">
          {/* Category Group Tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-[#F5F5F5]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/60 mr-1">
              Product Families:
            </span>
            <button
              type="button"
              onClick={() => setSubCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap ${
                subCategoryFilter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
              }`}
            >
              All Families ({kitchenwareProducts.length})
            </button>
            {KITCHENWARE_SUBCATEGORIES.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubCategoryFilter(sub)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                  subCategoryFilter === sub
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Product Type Filter Buttons */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/65 mb-2">
              Product Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KITCHENWARE_FILTER_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    typeFilter === t.id
                      ? 'bg-[#5B1018] text-white border-[#5B1018]'
                      : 'bg-[#F5F5F5] text-[#292321] border-transparent hover:border-[#B8B8B3]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Name, Size Dropdown, Model Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label
                htmlFor="kw-search-name"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/65 mb-1.5"
              >
                Product Name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#292321]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="kw-search-name"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tray, masal dani, gullak, pooja peti..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-[#B8B8B3] text-black placeholder:text-[#292321]/45 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="kw-filter-size"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/65 mb-1.5"
              >
                Size / Dimensions
              </label>
              <select
                id="kw-filter-size"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#B8B8B3] text-black focus:border-black focus:outline-none"
              >
                <option value="all">All Sizes</option>
                {availableDimensionOptions.map((dim) => (
                  <option key={dim} value={dim}>
                    {dim}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="kw-filter-model"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/65 mb-1.5"
              >
                Model
              </label>
              <select
                id="kw-filter-model"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#B8B8B3] text-black focus:border-black focus:outline-none"
              >
                <option value="all">All Models</option>
                {availableModelOptions.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                type="button"
                onClick={resetAllFilters}
                disabled={!hasActiveFilter}
                className="w-full py-2.5 px-3 border border-[#B8B8B3] text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16 space-y-16">
        {filteredProducts.length === 0 ? (
          <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-12 text-center space-y-4">
            <p className="font-display text-lg font-semibold text-black">
              No matching product families found
            </p>
            <p className="text-sm text-[#292321]/75 max-w-md mx-auto">
              Adjust your product type, dimension, or model filter to browse our
              Kitchenware &amp; Home Utility range.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-6 py-2.5 bg-black text-white text-xs font-semibold tracking-[0.08em] uppercase"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          groupedSections.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-5 mb-8 border-b border-[#B8B8B3]/60">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-1">
                    Product Category
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-black">
                    {group.title} ({group.items.length})
                  </h2>
                </div>
                <p className="text-xs text-[#292321]/70">
                  Open any product family to view all models, weights &amp; packaging
                  specs
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                {group.items.map((prod) => (
                  <KitchenwareCard
                    key={prod.id}
                    product={prod}
                    onNavigate={onNavigate}
                    onEnquireNow={handleEnquireNow}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Active B2B Bulk Quotation Summary Bar */}
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
                Add multiple models across trays, masal danis, and pooja products into a
                single bulk enquiry.
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
