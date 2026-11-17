import { useEffect, useMemo, useState } from 'react';
import { FileText, MessageCircle, Search } from 'lucide-react';
import type { Product, ProductCategoryId } from '../types/catalog';
import { SILVER_LINING_SUBCATEGORIES } from '../data/silverLiningProducts';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { EditableText } from '../components/EditableText';

interface CategoryPageProps {
  categoryId?: ProductCategoryId;
  onNavigate: (path: string) => void;
}

const CATALOG_SPEC_DETAILS: Record<string, { power?: string; weight?: string }> = {
  'TSL-81': { power: '2.5 kW', weight: '4.5 kg' },
  'TSL-EF-81': { power: '2.5 kW', weight: '4.5 kg' },
  'TSL-82': { power: '2.5 kW + 2.5 kW', weight: '8.26 kg' },
  'TSL-EF-82': { power: '2.5 kW + 2.5 kW', weight: '8.26 kg' },
  'TSL-88': { power: '2.8 kW', weight: '5.3 kg' },
  'TSL-EF-88': { power: '2.8 kW', weight: '5.3 kg' },
  'TSL-89': { power: '2.8 kW + 2.8 kW', weight: '7.9 kg' },
  'TSL-EF-89': { power: '2.8 kW + 2.8 kW', weight: '7.9 kg' },
  'TSL-81A': { power: '2.5 kW', weight: '4.71 kg' },
  'TSL-EF-81A': { power: '2.5 kW', weight: '4.71 kg' },
  'TSL-82A': { power: '2.5 kW + 2.5 kW', weight: '8.26 kg' },
  'TSL-EF-82A': { power: '2.5 kW + 2.5 kW', weight: '8.26 kg' },
  'TSL-811': { power: '1.8 kW', weight: '14 kg' },
  'TSL-811E': { power: '2.2 kW', weight: '16 kg' },
  'TSL-811 E': { power: '2.2 kW', weight: '16 kg' },
  'TSL-813': { power: '1.8 kW + 1.8 kW', weight: '24 kg' },
  'TSL-813E': { power: '2.2 kW + 2.2 kW', weight: '34 kg' },
  'TSL-813 E': { power: '2.2 kW + 2.2 kW', weight: '34 kg' },
  'TSL-IC-3500': { power: '3.5 kW', weight: '5.33 kg' },
  'TSL-3500': { power: '3.5 kW', weight: '5.33 kg' },
  'TSL-IC-3500A': { power: '3.5 kW', weight: '5.53 kg' },
  'TSL-3500A': { power: '3.5 kW', weight: '5.53 kg' },
  'TSL-IC-5000': { power: '5.0 kW', weight: '7 kg' },
  'TSL-5000': { power: '5.0 kW', weight: '7 kg' },
  'TSL-IC-5000A': { power: '5.0 kW', weight: '7 kg' },
  'TSL-5000A': { power: '5.0 kW', weight: '7 kg' },
  'TSL-WB-1': { power: '1.2 kW', weight: '5.7 kg' },
  'TSL-HES-936': { power: '2.0 kW' },
  'TSL-936': { power: '2.0 kW' },
  'TSL-HES-938': { power: '2.2 kW' },
  'TSL-938': { power: '2.2 kW' },
  'TSL-HES-937': { power: '4.0 kW' },
  'TSL-937': { power: '4.0 kW' },
  'TSL-818A': { power: '3.0 kW', weight: '25 kg' },
  'TSL-828A': { power: '3.0 kW', weight: '25 kg' },
  'TSL-820': { power: '4.4 kW', weight: '34 kg' },
  'TSL-822': { power: '4.4 kW', weight: '34 kg' },
  'TSL-T4': { power: '2.24 kW', weight: '4.4 kg' },
  'TSL-T6': { power: '3.2 kW', weight: '5.9 kg' },
  'TSL-46': { power: '3.2 kW', weight: '24 kg' },
  'TSL-1-ST': { power: '2.0 kW', weight: '24 kg' },
  'TSL-2-ST': { power: '4.0 kW', weight: '30 kg' },
  'TSL-55-1': { power: '3.2 kW', weight: '32 kg' },
  'TSL-55-2': { power: '6.4 kW', weight: '61 kg' },
  'TSL-MS-11': { weight: '28 cm' },
  'TSL-MS-12': { weight: '30 cm' },
  'TSL-MS-13': { weight: '32 cm' },
  'TSL-MS-14': { weight: '36 cm' },
};

function getProductPower(p: Product): string {
  const code = (p.modelNumber || '').toUpperCase().trim();
  if (CATALOG_SPEC_DETAILS[code]?.power) return CATALOG_SPEC_DETAILS[code].power!;
  const spec = p.specifications?.find((s) => s.label.toLowerCase().includes('power'));
  return spec?.value || '—';
}

function getProductWeight(p: Product): string {
  const code = (p.modelNumber || '').toUpperCase().trim();
  if (CATALOG_SPEC_DETAILS[code]?.weight) return CATALOG_SPEC_DETAILS[code].weight!;
  const spec = p.specifications?.find(
    (s) =>
      s.label.toLowerCase().includes('weight') ||
      s.label.toLowerCase().includes('wt')
  );
  return spec?.value || '—';
}

export function CategoryPage({ categoryId, onNavigate }: CategoryPageProps) {
  const {
    products,
    loadingProducts,
    categoriesWithOverrides,
    getCategoryDisplay,
    addToQuote,
    getWhatsAppUrl,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');

  useEffect(() => {
    setSelectedSubCategory('all');
  }, [categoryId]);

  const activeCategory = categoryId
    ? getCategoryDisplay(categoryId)
    : undefined;

  const availableSubCategories = useMemo(() => {
    const categoryProducts = categoryId
      ? products.filter((p) => p.category === categoryId)
      : products;
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      if (p.subCategory) {
        counts.set(p.subCategory, (counts.get(p.subCategory) || 0) + 1);
      }
    }
    const ordered: { name: string; count: number }[] = [];
    for (const sub of SILVER_LINING_SUBCATEGORIES) {
      const c = counts.get(sub);
      if (c) ordered.push({ name: sub, count: c });
    }
    for (const [name, count] of counts.entries()) {
      if (!ordered.some((o) => o.name === name)) {
        ordered.push({ name, count });
      }
    }
    return ordered;
  }, [products, categoryId]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.category !== categoryId) return false;
      if (selectedSubCategory !== 'all' && p.subCategory !== selectedSubCategory) {
        return false;
      }
      if (!q) return true;
      const inName = p.name.toLowerCase().includes(q);
      const inModel = p.modelNumber.toLowerCase().includes(q);
      const inSub = (p.subCategory || '').toLowerCase().includes(q);
      const inSizes = (p.availableSizes || []).some((s) =>
        s.toLowerCase().includes(q)
      );
      const inDesc = p.description.toLowerCase().includes(q);
      return inName || inModel || inSub || inSizes || inDesc;
    });
  }, [products, categoryId, selectedSubCategory, searchTerm]);

  const handleQuickAdd = (product: Product) => {
    addToQuote({
      productId: product.id,
      category: product.category,
      productName: product.name,
      modelOrSize: product.availableSizes?.[0] || product.modelNumber || 'Standard',
      quantity: 1,
    });
    onNavigate('/quote');
  };

  const pageScopeId = categoryId || 'all';

  return (
    <div className="bg-white min-h-[70vh]">
      {/* Category Header */}
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
              className={activeCategory ? 'hover:text-black' : 'text-black font-medium'}
            >
              Products
            </a>
            {activeCategory && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-black font-medium">{activeCategory.title}</span>
              </>
            )}
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-3">
              <EditableText
                id={`category.${pageScopeId}.eyebrow`}
                defaultText={
                  categoryId === 'commercial-kitchen-equipment'
                    ? 'THE SILVER LINING · Commercial Kitchen Equipment'
                    : activeCategory
                    ? 'Product Category'
                    : 'Complete Catalogue'
                }
                label="Category Page Eyebrow"
                as="p"
                className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]"
              />
              <EditableText
                id={`category.${pageScopeId}.heading`}
                defaultText={
                  activeCategory ? activeCategory.title : 'All Stainless Steel Products'
                }
                label="Category Page Heading"
                as="h1"
                allowDelete={false}
                className="font-display text-3xl md:text-4xl font-semibold text-black tracking-tight uppercase"
              />
              <EditableText
                id={`category.${pageScopeId}.description`}
                defaultText={
                  categoryId === 'commercial-kitchen-equipment'
                    ? 'Explore The Silver Lining commercial kitchen equipment range spanning 30 models across 9 specialised equipment categories.'
                    : activeCategory
                    ? activeCategory.fullDescription
                    : 'Browse across our three core product divisions: Kitchenware & Home Utility, GN Pans & Accessories, and Commercial Kitchen Equipment.'
                }
                label="Category Page Description"
                as="p"
                multiline
                allowExtraParagraphs
                className="text-base text-[#292321]/80 leading-relaxed max-w-2xl"
              />
            </div>

            <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
              <a
                href={getWhatsAppUrl(
                  `Hello SHREE DURGA STEELS, I would like to request a quotation for ${activeCategory?.title || 'your products'}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <EditableText
                  id="category.cta.requestQuote"
                  defaultText="Quote on WhatsApp"
                  label="Category Request Quotation Button"
                  allowDelete={false}
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Category Switcher Bar */}
      <section className="border-b border-[#B8B8B3]/50 bg-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('/products')}
                className={`px-4 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors whitespace-nowrap ${
                  !categoryId
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                }`}
              >
                All Categories
              </button>
              {categoriesWithOverrides.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onNavigate(`/products/${cat.id}`)}
                  className={`px-4 py-2 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors whitespace-nowrap ${
                    categoryId === cat.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-[#292321] border-[#B8B8B3] hover:border-black'
                  }`}
                >
                  {cat.navLabel}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-[#292321]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, model or size..."
                aria-label="Search products"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#B8B8B3] text-black placeholder:text-[#292321]/50 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* Sub-Category Filter Tabs for Commercial Kitchen Equipment */}
          {availableSubCategories.length > 0 && (
            <div className="pt-3 border-t border-[#F5F5F5] flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#292321]/60 mr-2">
                Equipment Line:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubCategory('all')}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                  selectedSubCategory === 'all'
                    ? 'bg-[#5B1018] text-white border-[#5B1018]'
                    : 'bg-[#F5F5F5] text-[#292321] border-transparent hover:border-[#B8B8B3]'
                }`}
              >
                All Equipment
              </button>
              {availableSubCategories.map((sub) => (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub.name)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                    selectedSubCategory === sub.name
                      ? 'bg-[#5B1018] text-white border-[#5B1018]'
                      : 'bg-[#F5F5F5] text-[#292321] border-transparent hover:border-[#B8B8B3]'
                  }`}
                >
                  {sub.name} ({sub.count})
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between mb-8 text-xs text-[#292321]/70">
            <p className="tabular-nums">
              Showing {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'entry' : 'entries'}
              {selectedSubCategory !== 'all' ? ` in ${selectedSubCategory}` : ''}
            </p>
            <p>
              Ready for comparison and multi-item quotation enquiries
            </p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="border border-[#B8B8B3]/50 bg-[#F5F5F5] h-96 animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-12 text-center space-y-4">
              <p className="font-display text-lg font-semibold text-black">
                No matching products found
              </p>
              <p className="text-sm text-[#292321]/75 max-w-md mx-auto">
                Try clearing your search filter, or contact us directly for custom B2B
                requirements in this category.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                {(searchTerm || selectedSubCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSubCategory('all');
                    }}
                    className="px-5 py-2.5 bg-white border border-black text-xs font-semibold tracking-[0.06em] uppercase"
                  >
                    Reset Filters
                  </button>
                )}
                <a
                  href="/quote"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/quote');
                  }}
                  className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.06em] uppercase"
                >
                  Request Custom Quote
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onNavigate={onNavigate}
                  onQuickAddQuote={handleQuickAdd}
                />
              ))}
            </div>
          )}

          {/* Quick Comparison Specification Table */}
          {filteredProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-[#B8B8B3]/60">
              <h2 className="font-display text-xl font-semibold text-black mb-6">
                Catalogue Quick Reference
              </h2>
              <div className="overflow-x-auto border border-[#B8B8B3]/70">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#B8B8B3]/70 text-xs uppercase tracking-[0.06em] text-[#292321]">
                      <th className="py-3.5 px-4 font-semibold">Product</th>
                      <th className="py-3.5 px-4 font-semibold">Model No.</th>
                      <th className="py-3.5 px-4 font-semibold">Equipment Line</th>
                      <th className="py-3.5 px-4 font-semibold">Power Rating</th>
                      <th className="py-3.5 px-4 font-semibold">Weight</th>
                      <th className="py-3.5 px-4 font-semibold">Dimensions / Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B8B8B3]/40 bg-white">
                    {filteredProducts.map((product) => (
                      <tr key={`row-${product.id}`} className="hover:bg-[#F5F5F5]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-black">
                          <a
                            href={`/product/${product.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onNavigate(`/product/${product.id}`);
                            }}
                            className="hover:text-[#5B1018] font-semibold"
                          >
                            {product.name}
                          </a>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-[#5B1018] font-medium">
                          {product.modelNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#292321]/75">
                          {product.subCategory || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-black font-medium tabular-nums">
                          {getProductPower(product)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#292321] tabular-nums">
                          {getProductWeight(product)}
                        </td>
                        <td className="py-3.5 px-4 text-xs tabular-nums text-[#292321]/80">
                          {product.dimensions ||
                            (product.availableSizes && product.availableSizes.length > 0
                              ? product.availableSizes.join(', ')
                              : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
