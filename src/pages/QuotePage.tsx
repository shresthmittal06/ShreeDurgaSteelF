import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useStore } from '../context/StoreContext';
import {
  CATEGORIES,
  formatInrPrice,
  getCategoryMeta,
  type EnquiryItem,
  type ProductCategoryId,
} from '../types/catalog';
import { EditableText } from '../components/EditableText';

interface QuotePageProps {
  onNavigate: (path: string) => void;
}

interface SubmittedSummary {
  enquiryId: string;
  companyName: string;
  name: string;
  email: string;
  items: EnquiryItem[];
  emailed: boolean;
}

export function QuotePage({ onNavigate }: QuotePageProps) {
  const {
    products,
    settings,
    quoteItems,
    addToQuote,
    removeFromQuote,
    updateQuoteQuantity,
    clearQuote,
    getWhatsAppUrl,
  } = useStore();

  // Item Builder State
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategoryId>('kitchenware-home-utility');
  const categoryProducts = useMemo(
    () => products.filter((p) => p.category === selectedCategory),
    [products, selectedCategory]
  );

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customProductName, setCustomProductName] = useState<string>('');
  const [selectedModelOrSize, setSelectedModelOrSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Keep product selector synchronized with category
  useEffect(() => {
    if (categoryProducts.length > 0) {
      const first = categoryProducts[0];
      setSelectedProductId(first.id);
      setSelectedModelOrSize(
        first.variants?.[0]?.label ||
          first.availableSizes?.[0] ||
          first.modelNumber ||
          'Standard'
      );
    } else {
      setSelectedProductId('custom');
      setSelectedModelOrSize('');
    }
  }, [selectedCategory, categoryProducts]);

  const activeProduct = useMemo(
    () => categoryProducts.find((p) => p.id === selectedProductId),
    [categoryProducts, selectedProductId]
  );

  useEffect(() => {
    if (activeProduct) {
      setSelectedModelOrSize(
        activeProduct.variants?.[0]?.label ||
          activeProduct.availableSizes?.[0] ||
          activeProduct.modelNumber ||
          'Standard'
      );
    }
  }, [activeProduct]);

  // Customer Contact Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);

  const handleAddItem = () => {
    setFormError(null);
    const isCustom = selectedProductId === 'custom' || !activeProduct;
    const resolvedName = isCustom
      ? customProductName.trim()
      : activeProduct.name;

    if (!resolvedName) {
      setFormError('Please select a product or enter a product name.');
      return;
    }

    const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
    addToQuote({
      ...(activeProduct ? { productId: activeProduct.id } : {}),
      category: selectedCategory,
      productName: resolvedName,
      modelOrSize: selectedModelOrSize.trim() || 'Standard',
      quantity: safeQty,
      ...(itemNotes.trim() ? { notes: itemNotes.trim() } : {}),
    });
    setItemNotes('');
    if (isCustom) setCustomProductName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Build effective items list (if user hasn't clicked "Add", auto-include current valid selection if list is empty)
    let effectiveItems = [...quoteItems];
    if (effectiveItems.length === 0) {
      const isCustom = selectedProductId === 'custom' || !activeProduct;
      const resolvedName = isCustom ? customProductName.trim() : activeProduct?.name;
      if (resolvedName) {
        effectiveItems = [
          {
            ...(activeProduct ? { productId: activeProduct.id } : {}),
            category: selectedCategory,
            productName: resolvedName,
            modelOrSize: selectedModelOrSize.trim() || 'Standard',
            quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
            ...(itemNotes.trim() ? { notes: itemNotes.trim() } : {}),
          },
        ];
      }
    }

    if (effectiveItems.length === 0) {
      setFormError('Please add at least one product to your quotation request.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedCompany = companyName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();

    if (
      !trimmedName ||
      !trimmedCompany ||
      !trimmedPhone ||
      !trimmedEmail ||
      !trimmedCity ||
      !trimmedCountry
    ) {
      setFormError('Please complete all required customer and business details.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid business email address.');
      return;
    }

    if (trimmedPhone.replace(/[^0-9+]/g, '').length < 6) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }

    setSubmitting(true);
    const enquiryId = `enq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const sanitizedItems: EnquiryItem[] = effectiveItems.slice(0, 25).map((item) => ({
      ...(item.productId && /^[a-zA-Z0-9_-]+$/.test(item.productId)
        ? { productId: item.productId }
        : {}),
      category: item.category.slice(0, 80),
      productName: item.productName.slice(0, 200),
      modelOrSize: (item.modelOrSize || 'Standard').slice(0, 120),
      quantity: Math.max(1, Math.min(10000000, Math.floor(Number(item.quantity) || 1))),
      ...(item.notes ? { notes: item.notes.slice(0, 300) } : {}),
    }));

    const payload = {
      id: enquiryId,
      name: trimmedName.slice(0, 120),
      companyName: trimmedCompany.slice(0, 160),
      phone: trimmedPhone.slice(0, 40),
      email: trimmedEmail.slice(0, 160),
      city: trimmedCity.slice(0, 100),
      country: trimmedCountry.slice(0, 100),
      ...(message.trim() ? { message: message.trim().slice(0, 2000) } : {}),
      items: sanitizedItems,
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'enquiries', enquiryId), payload);
    } catch (err) {
      setSubmitting(false);
      setFormError(
        'Could not save your quotation request. Please check your details and try again.'
      );
      try {
        handleFirestoreError(err, OperationType.CREATE, `enquiries/${enquiryId}`);
      } catch {
        // Logged by handleFirestoreError
      }
      return;
    }

    let emailed = false;
    try {
      const resp = await fetch('/api/enquiries/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryId,
          name: trimmedName,
          companyName: trimmedCompany,
          phone: trimmedPhone,
          email: trimmedEmail,
          city: trimmedCity,
          country: trimmedCountry,
          message: message.trim(),
          items: sanitizedItems,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        emailed = Boolean(data.emailed);
      }
    } catch {
      // Non-fatal: enquiry is already stored securely in Firestore
    }

    clearQuote();
    setSubmitting(false);
    setSubmitted({
      enquiryId,
      companyName: trimmedCompany,
      name: trimmedName,
      email: trimmedEmail,
      items: sanitizedItems,
      emailed,
    });
  };

  if (submitted) {
    const waSummary = `Hello SHREE DURGA STEELS, I have submitted Quotation Request ${submitted.enquiryId} for ${submitted.companyName} (${submitted.items.length} item(s)).`;

    return (
      <div className="bg-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="border border-black bg-white p-8 sm:p-12 space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#5B1018] text-white">
              <Check className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]">
                Quotation Request Received
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-black">
                Thank you, {submitted.name}. Your enquiry has been recorded.
              </h1>
              <p className="text-sm text-[#292321]/80 leading-relaxed">
                Reference ID:{' '}
                <span className="font-mono font-semibold text-black tabular-nums">
                  {submitted.enquiryId}
                </span>
                . Our B2B sales team will review your requested items for{' '}
                <strong>{submitted.companyName}</strong> and respond to{' '}
                <strong>{submitted.email}</strong>.
              </p>
            </div>

            <div className="border border-[#B8B8B3]/70 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#B8B8B3]/70 uppercase tracking-[0.06em]">
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">Model / Size</th>
                    <th className="py-3 px-4 font-semibold text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B8B8B3]/40">
                  {submitted.items.map((item, idx) => (
                    <tr key={`${item.productName}-${idx}`}>
                      <td className="py-3 px-4 text-[#292321]/75">
                        {getCategoryMeta(item.category).title}
                      </td>
                      <td className="py-3 px-4 font-medium text-black">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {item.modelOrSize}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href={getWhatsAppUrl(waSummary)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#292321]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Copy via WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(null);
                  setMessage('');
                }}
                className="px-6 py-3 bg-white border border-black text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#F5F5F5]"
              >
                Submit Another Enquiry
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/products')}
                className="px-6 py-3 text-xs font-semibold tracking-[0.08em] uppercase text-[#5B1018] hover:underline"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <section className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 py-12 md:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <EditableText
            id="quote.header.eyebrow"
            defaultText="B2B Quotation System"
            label="Quote Page Eyebrow"
            as="p"
            className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-2"
          />
          <EditableText
            id="quote.header.heading"
            defaultText="Request a Customised Quotation"
            label="Quote Page Main Heading"
            as="h1"
            allowDelete={false}
            className="font-display text-3xl md:text-4xl font-semibold text-black tracking-tight"
          />
          <EditableText
            id="quote.header.description"
            defaultText="Select one or multiple products across our categories, specify required sizes and quantities, and submit your business contact details for a formal quotation."
            label="Quote Page Description"
            as="p"
            multiline
            allowExtraParagraphs
            className="mt-3 text-base text-[#292321]/80 max-w-2xl"
          />
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* LEFT COLUMN: Multi-Product Selection Builder */}
            <div className="lg:col-span-6 space-y-8">
              <div className="border border-[#B8B8B3]/80 bg-white p-6 sm:p-8 space-y-5">
                <div className="border-b border-[#B8B8B3]/50 pb-4">
                  <span className="font-mono text-xs text-[#5B1018]">STEP 01</span>
                  <EditableText
                    id="quote.step1.heading"
                    defaultText="Add Products to Quotation"
                    label="Quote Step 1 Heading"
                    as="h2"
                    className="font-display text-xl font-semibold text-black mt-1"
                  />
                </div>

                {/* 1. Select Category */}
                <div>
                  <label
                    htmlFor="quote-category"
                    className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                  >
                    1. Product Category
                  </label>
                  <select
                    id="quote-category"
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as ProductCategoryId)
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Individual Product */}
                <div>
                  <label
                    htmlFor="quote-product"
                    className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                  >
                    2. Select Product
                  </label>
                  <select
                    id="quote-product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                  >
                    {categoryProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.modelNumber ? ` (${p.modelNumber})` : ''}
                      </option>
                    ))}
                    <option value="custom">
                      Other / Custom Product Requirement
                    </option>
                  </select>
                </div>

                {(selectedProductId === 'custom' || !activeProduct) && (
                  <div>
                    <label
                      htmlFor="quote-custom-name"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Custom Product Name / Description
                    </label>
                    <input
                      id="quote-custom-name"
                      type="text"
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      placeholder="Enter required stainless steel item..."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                )}

                {/* 3. Select Size / Model & Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="quote-size"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      3. Size, Depth or Model
                    </label>
                    {activeProduct?.variants && activeProduct.variants.length > 0 ? (
                      <select
                        id="quote-size"
                        value={selectedModelOrSize}
                        onChange={(e) => setSelectedModelOrSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                      >
                        {activeProduct.variants.map((v) => {
                          const dim = v.dimensionsMm
                            ? `${v.dimensionsMm} mm`
                            : v.dimensionsIn && v.dimensionsIn !== 'Contact for Details'
                            ? v.dimensionsIn
                            : '';
                          const wt =
                            v.individualWeight &&
                            v.individualWeight !== 'Contact for Details'
                              ? v.individualWeight
                              : '';
                          const metaParts = [dim, v.capacity, wt].filter(Boolean);
                          const priceSuffix =
                            typeof v.netPrice === 'number' &&
                            settings.showPrices !== false
                              ? ` — ${formatInrPrice(v.netPrice)}/pc`
                              : '';
                          return (
                            <option key={v.label} value={v.label}>
                              {v.label}
                              {metaParts.length > 0
                                ? ` (${metaParts.join(', ')})`
                                : ''}
                              {priceSuffix}
                            </option>
                          );
                        })}
                      </select>
                    ) : activeProduct?.availableSizes &&
                      activeProduct.availableSizes.length > 0 ? (
                      <select
                        id="quote-size"
                        value={selectedModelOrSize}
                        onChange={(e) => setSelectedModelOrSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                      >
                        {activeProduct.availableSizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        {activeProduct.modelNumber && (
                          <option value={activeProduct.modelNumber}>
                            Model: {activeProduct.modelNumber}
                          </option>
                        )}
                      </select>
                    ) : (
                      <input
                        id="quote-size"
                        type="text"
                        value={selectedModelOrSize}
                        onChange={(e) => setSelectedModelOrSize(e.target.value)}
                        placeholder="e.g. 1/1 × 100 MM or Standard"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="quote-qty"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      4. Required Quantity
                    </label>
                    <input
                      id="quote-qty"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black tabular-nums focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quote-item-notes"
                    className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                  >
                    5. Item Requirements / Notes (Optional)
                  </label>
                  <input
                    id="quote-item-notes"
                    type="text"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="Packaging, finish, lid requirement, or delivery schedule..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-3 px-5 bg-white border border-black text-xs font-semibold tracking-[0.08em] uppercase text-black hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product to Quotation List</span>
                </button>
              </div>

              {/* Selected Items List */}
              <div className="border border-[#B8B8B3]/80 bg-[#F5F5F5] p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-[#B8B8B3]/60 pb-3 mb-4">
                  <h3 className="font-display text-base font-semibold text-black">
                    Selected Products ({quoteItems.length})
                  </h3>
                  {quoteItems.length > 0 && (
                    <button
                      type="button"
                      onClick={clearQuote}
                      className="text-xs text-[#5B1018] font-medium hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {quoteItems.length === 0 ? (
                  <p className="text-sm text-[#292321]/70">
                    No products added yet. Use the selector above to add one or more
                    products to your enquiry.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {quoteItems.map((item, idx) => {
                      const matchedProd = item.productId
                        ? products.find((p) => p.id === item.productId)
                        : undefined;
                      const matchedVariant = matchedProd?.variants?.find(
                        (v) => v.label === item.modelOrSize
                      );
                      return (
                        <div
                          key={`${item.productName}-${item.modelOrSize}-${idx}`}
                          className="bg-white border border-[#B8B8B3]/70 p-4 flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-[11px] uppercase tracking-[0.06em] text-[#292321]/60">
                              {getCategoryMeta(item.category).title}
                            </p>
                            <p className="text-sm font-semibold text-black">
                              {item.productName}
                            </p>
                            <p className="text-xs font-mono text-[#292321]/75 tabular-nums">
                              {item.modelOrSize}
                              {typeof matchedVariant?.netPrice === 'number' &&
                              settings.showPrices !== false
                                ? ` · ${formatInrPrice(matchedVariant.netPrice)} / pc`
                                : ''}
                            </p>
                            {matchedVariant &&
                              (matchedVariant.dimensionsIn ||
                                matchedVariant.individualWeight) && (
                                <p className="text-[11px] font-mono text-[#292321]/65 tabular-nums">
                                  {[
                                    matchedVariant.dimensionsMm
                                      ? `${matchedVariant.dimensionsMm} mm`
                                      : matchedVariant.dimensionsIn &&
                                        matchedVariant.dimensionsIn !==
                                          'Contact for Details'
                                      ? matchedVariant.dimensionsIn
                                      : '',
                                    matchedVariant.individualWeight &&
                                    matchedVariant.individualWeight !==
                                      'Contact for Details'
                                      ? `Wt: ${matchedVariant.individualWeight}`
                                      : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                            {item.notes && (
                              <p className="text-xs text-[#292321]/70 italic">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={1}
                            aria-label={`Quantity for ${item.productName}`}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuoteQuantity(
                                idx,
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-20 px-2.5 py-1.5 border border-[#B8B8B3] text-xs font-mono tabular-nums text-black bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeFromQuote(idx)}
                            aria-label={`Remove ${item.productName}`}
                            className="p-2 text-[#292321]/60 hover:text-[#5B1018] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Customer & Business Details Form */}
            <div className="lg:col-span-6">
              <form
                onSubmit={handleSubmit}
                noValidate
                className="border border-[#B8B8B3]/80 bg-white p-6 sm:p-8 space-y-5"
              >
                <div className="border-b border-[#B8B8B3]/50 pb-4">
                  <span className="font-mono text-xs text-[#5B1018]">STEP 02</span>
                  <EditableText
                    id="quote.step2.heading"
                    defaultText="Customer & Business Details"
                    label="Quote Step 2 Heading"
                    as="h2"
                    className="font-display text-xl font-semibold text-black mt-1"
                  />
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="p-4 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018]"
                  >
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cust-name"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Name *
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cust-company"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Company Name *
                    </label>
                    <input
                      id="cust-company"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Business / Hotel / Distributor"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cust-phone"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Phone Number *
                    </label>
                    <input
                      id="cust-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98000 00000"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black tabular-nums focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cust-email"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      id="cust-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="procurement@company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cust-city"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      City *
                    </label>
                    <input
                      id="cust-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cust-country"
                      className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                    >
                      Country *
                    </label>
                    <input
                      id="cust-country"
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cust-message"
                    className="block text-xs font-semibold tracking-[0.06em] uppercase text-[#292321] mb-2"
                  >
                    Additional Message &amp; Requirements
                  </label>
                  <textarea
                    id="cust-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share delivery destination, expected timeline, branding/custom requirements, or commercial terms..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] disabled:opacity-60 transition-colors"
                  >
                    {submitting ? (
                      'Submitting Quotation Request...'
                    ) : (
                      <EditableText
                        id="quote.submitButton"
                        defaultText="SUBMIT QUOTATION REQUEST"
                        label="Quote Submit Button Label"
                        allowDelete={false}
                      />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
