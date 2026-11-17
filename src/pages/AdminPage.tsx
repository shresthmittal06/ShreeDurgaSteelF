import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Check,
  Eye,
  FolderOpen,
  LogOut,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  compressImagePreserveRatio,
  uploadImageAssetToFirestore,
} from '../lib/mediaUtils';
import { saveProductRecordToFirestore } from '../lib/productPersistence';
import { useStore } from '../context/StoreContext';
import {
  CATEGORIES,
  getCategoryMeta,
  type Enquiry,
  type EnquiryStatus,
  type KitchenwareFilterTag,
  type MediaUsage,
  type Product,
  type ProductCategoryId,
  type ProductSpecification,
  type ProductType,
  type ProductVariant,
  type SiteSettings,
} from '../types/catalog';
import { KITCHENWARE_FILTER_TYPES } from '../data/kitchenwareCatalog';
import { ProductVisual } from '../components/ProductVisual';
import { ImageLibraryModal, ImageLibraryPanel } from '../components/ImageLibraryModal';
import { AboutEditorPanel } from '../components/AboutEditorPanel';
import { CategoryAndBrandEditor } from '../components/CategoryAndBrandEditor';
import { HeroVideoManager } from '../components/HeroVideoManager';

type AdminTab = 'products' | 'content' | 'media' | 'enquiries' | 'settings';

function getUsageForCategory(category: ProductCategoryId): MediaUsage {
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

export function AdminPage() {
  const {
    products,
    realProducts,
    settings,
    mediaAssets,
    user,
    authReady,
    isAuthenticatedAdmin,
    signInAdmin,
    signOutAdmin,
    updateSettings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [adminCatFilter, setAdminCatFilter] = useState<string>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Per-Product Row Image Management State
  const [stagedRowImages, setStagedRowImages] = useState<
    Record<string, { file: File; previewUrl: string; fit: 'contain' | 'cover' }>
  >({});
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [previewModalProductId, setPreviewModalProductId] = useState<string | null>(null);

  // Product Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] =
    useState<ProductCategoryId>('kitchenware-home-utility');
  const [pSubCategory, setPSubCategory] = useState('');
  const [pBrandLine, setPBrandLine] = useState('');
  const [pModelNumber, setPModelNumber] = useState('');
  const [pMainImage, setPMainImage] = useState('');
  const [pStagedFile, setPStagedFile] = useState<File | null>(null);
  const [pStagedPreviewUrl, setPStagedPreviewUrl] = useState('');
  const [pMainPosX, setPMainPosX] = useState(50);
  const [pMainPosY, setPMainPosY] = useState(50);
  const [pMainFit, setPMainFit] = useState<'contain' | 'cover'>('contain');
  const [pDescription, setPDescription] = useState('');
  const [pSizesText, setPSizesText] = useState('');
  const [pDimensions, setPDimensions] = useState('');
  const [pMaterial, setPMaterial] = useState('');
  const [pSpecs, setPSpecs] = useState<ProductSpecification[]>([
    { label: '', value: '' },
  ]);
  const [pGnSize, setPGnSize] = useState('');
  const [pProductType, setPProductType] = useState<ProductType | ''>('');
  const [pMatchingLidId, setPMatchingLidId] = useState('');
  const [pVariants, setPVariants] = useState<ProductVariant[]>([]);
  const [pPackagingInfo, setPPackagingInfo] = useState('');
  const [pFilterTags, setPFilterTags] = useState<KitchenwareFilterTag[]>([]);
  const [pIsAvailable, setPIsAvailable] = useState(true);
  const [pRelatedIds, setPRelatedIds] = useState<string[]>([]);
  const [pFeatured, setPFeatured] = useState(true);
  const [pSortOrder, setPSortOrder] = useState(1);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productLibraryOpen, setProductLibraryOpen] = useState(false);
  const [showProductPreview, setShowProductPreview] = useState(false);

  // Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>({
    ...settings,
    showPrices: settings.showPrices ?? true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettingsPreview, setShowSettingsPreview] = useState(false);

  useEffect(() => {
    setSettingsDraft({
      ...settings,
      showPrices: settings.showPrices ?? true,
    });
  }, [settings]);

  useEffect(() => {
    fetch('/api/email-config-status')
      .then((r) => r.json())
      .then((d) => setSmtpConfigured(Boolean(d.configured)))
      .catch(() => setSmtpConfigured(false));
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthenticatedAdmin) {
      setEnquiries([]);
      return;
    }
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEnquiries(
          snap.docs.map((d) => ({ ...(d.data() as Enquiry), id: d.id }))
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'enquiries');
        } catch {
          // Logged
        }
      }
    );
    return () => unsub();
  }, [authReady, isAuthenticatedAdmin]);

  const resetProductForm = () => {
    setEditingId(null);
    setPName('');
    setPCategory('kitchenware-home-utility');
    setPSubCategory('');
    setPBrandLine('');
    setPModelNumber('');
    setPMainImage('');
    setPStagedFile(null);
    setPStagedPreviewUrl('');
    setPMainPosX(50);
    setPMainPosY(50);
    setPMainFit('contain');
    setPDescription('');
    setPSizesText('');
    setPDimensions('');
    setPMaterial('');
    setPSpecs([{ label: '', value: '' }]);
    setPGnSize('');
    setPProductType('');
    setPMatchingLidId('');
    setPVariants([]);
    setPPackagingInfo('');
    setPFilterTags([]);
    setPIsAvailable(true);
    setPRelatedIds([]);
    setPFeatured(true);
    setPSortOrder(realProducts.length + 1);
    setShowProductPreview(false);
  };

  const startEditProduct = (product: Product) => {
    setEditingId(product.id);
    setPName(product.name);
    setPCategory(product.category);
    setPSubCategory(product.subCategory || '');
    setPBrandLine(product.brandLine || '');
    setPModelNumber(product.modelNumber);
    setPMainImage(product.mainImage || '');
    setPStagedFile(null);
    setPStagedPreviewUrl('');
    const xy = parsePositionXY(product.mainImagePosition);
    setPMainPosX(xy.x);
    setPMainPosY(xy.y);
    setPMainFit(product.mainImageFit || 'contain');
    setPDescription(product.description);
    setPSizesText((product.availableSizes || []).join(', '));
    setPDimensions(product.dimensions || '');
    setPMaterial(product.materialDetails || '');
    setPSpecs(
      product.specifications && product.specifications.length > 0
        ? product.specifications
        : [{ label: '', value: '' }]
    );
    setPGnSize(product.gnSize || '');
    setPProductType(product.productType || '');
    setPMatchingLidId(product.matchingLidId || '');
    setPVariants(
      product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({ ...v }))
        : []
    );
    setPPackagingInfo(product.packagingInfo || '');
    setPFilterTags(product.filterTags || []);
    setPIsAvailable(product.isAvailable !== false);
    setPRelatedIds(product.relatedProductIds || []);
    setPFeatured(product.featured);
    setPSortOrder(product.sortOrder || 1);
    setShowProductPreview(false);
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMainImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setFeedback(null);
    try {
      const processed = await compressImagePreserveRatio(file);
      setPStagedFile(file);
      setPStagedPreviewUrl(processed.dataUrl);
      setShowProductPreview(true);
      setFeedback(
        'Product image preview ready. Review the preview below, then click SAVE or PUBLISH to save permanently.'
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Could not prepare image preview.'
      );
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRowImageSelect = async (
    prod: Product,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRowBusyId(prod.id);
    setFeedback(null);
    try {
      const processed = await compressImagePreserveRatio(file);
      setStagedRowImages((prev) => ({
        ...prev,
        [prod.id]: {
          file,
          previewUrl: processed.dataUrl,
          fit: prod.mainImageFit || 'contain',
        },
      }));
      setFeedback(
        `Preview ready for "${prod.name}". Click Preview to inspect or Save & Publish to make it live.`
      );
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : `Could not load image preview for "${prod.name}".`
      );
    } finally {
      setRowBusyId(null);
      e.target.value = '';
    }
  };

  const handlePublishRowImage = async (prod: Product) => {
    const staged = stagedRowImages[prod.id];
    if (!staged) return;
    setRowBusyId(prod.id);
    setFeedback(null);
    try {
      const uploaded = await uploadImageAssetToFirestore({
        file: staged.file,
        usage: getUsageForCategory(prod.category),
        name: `${prod.name} Photograph`,
      });
      const existingFirestoreDoc = realProducts.find((r) => r.id === prod.id);
      await saveProductRecordToFirestore(
        {
          ...prod,
          mainImage: uploaded.refUrl,
          mainImagePosition: prod.mainImagePosition || '50% 50%',
          mainImageFit: staged.fit,
          additionalImages: undefined,
        },
        existingFirestoreDoc
      );
      setStagedRowImages((prev) => {
        const next = { ...prev };
        delete next[prod.id];
        return next;
      });
      if (editingId === prod.id) {
        setPMainImage(uploaded.refUrl);
        setPStagedFile(null);
        setPStagedPreviewUrl('');
      }
      setFeedback(
        `Saved and published photograph for "${prod.name}" permanently to the live website.`
      );
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : `Failed to save photograph for "${prod.name}".`
      );
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCancelRowPreview = (productId: string) => {
    setStagedRowImages((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    if (previewModalProductId === productId) {
      setPreviewModalProductId(null);
    }
  };

  const handleSaveAllStagedRowImages = async () => {
    const entries = Object.entries(stagedRowImages);
    if (entries.length === 0) return;
    setFeedback(null);
    let savedCount = 0;
    const failedNames: string[] = [];
    let lastError: string | null = null;
    for (const [productId, staged] of entries) {
      const prod = products.find((p) => p.id === productId);
      if (!prod) continue;
      setRowBusyId(productId);
      try {
        const uploaded = await uploadImageAssetToFirestore({
          file: staged.file,
          usage: getUsageForCategory(prod.category),
          name: `${prod.name} Photograph`,
        });
        const existingFirestoreDoc = realProducts.find((r) => r.id === prod.id);
        await saveProductRecordToFirestore(
          {
            ...prod,
            mainImage: uploaded.refUrl,
            mainImagePosition: prod.mainImagePosition || '50% 50%',
            mainImageFit: staged.fit,
            additionalImages: undefined,
          },
          existingFirestoreDoc
        );
        setStagedRowImages((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        if (editingId === productId) {
          setPMainImage(uploaded.refUrl);
          setPStagedFile(null);
          setPStagedPreviewUrl('');
        }
        savedCount += 1;
      } catch (err) {
        failedNames.push(prod.name);
        if (err instanceof Error && err.message) {
          lastError = err.message;
        }
      }
    }

    setRowBusyId(null);
    if (failedNames.length > 0) {
      setFeedback(
        `Saved ${savedCount} image(s), failed for: ${failedNames.join(', ')}${
          lastError ? ` (${lastError})` : ''
        }.`
      );
    } else {
      setFeedback(
        `Saved and published ${savedCount} product photograph${savedCount === 1 ? '' : 's'} permanently.`
      );
    }
  };

  const handleCancelAllStagedRowImages = () => {
    setStagedRowImages({});
    setPreviewModalProductId(null);
  };

  const handleDeleteRowImage = async (prod: Product) => {
    setRowBusyId(prod.id);
    setFeedback(null);
    try {
      const existingFirestoreDoc = realProducts.find((r) => r.id === prod.id);
      await saveProductRecordToFirestore(
        {
          ...prod,
          mainImage: undefined,
          additionalImages: undefined,
        },
        existingFirestoreDoc
      );
      setStagedRowImages((prev) => {
        const next = { ...prev };
        delete next[prod.id];
        return next;
      });
      if (editingId === prod.id) {
        setPMainImage('');
        setPStagedFile(null);
        setPStagedPreviewUrl('');
      }
      if (previewModalProductId === prod.id) {
        setPreviewModalProductId(null);
      }
      setFeedback(`Deleted uploaded photograph for "${prod.name}".`);
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : `Could not delete photograph for "${prod.name}".`
      );
    } finally {
      setRowBusyId(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!pName.trim()) {
      setFeedback('Product Name is required.');
      return;
    }

    setSavingProduct(true);
    const id =
      editingId ||
      `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const availableSizes = pSizesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);

    const specifications = pSpecs
      .filter((s) => s.label.trim() && s.value.trim())
      .map((s) => ({
        label: s.label.trim().slice(0, 100),
        value: s.value.trim().slice(0, 300),
      }))
      .slice(0, 30);

    const existingFirestoreDoc = editingId
      ? realProducts.find((p) => p.id === editingId)
      : undefined;

    try {
      let resolvedMainImage = pMainImage.trim();
      if (pStagedFile) {
        const uploaded = await uploadImageAssetToFirestore({
          file: pStagedFile,
          usage: getUsageForCategory(pCategory),
          name: `${pName.trim()} Photograph (${pStagedFile.name})`,
        });
        resolvedMainImage = uploaded.refUrl;
      }

      const productPayload: Product = {
        id,
        name: pName.trim(),
        category: pCategory,
        subCategory: pSubCategory.trim() || undefined,
        brandLine: pBrandLine.trim() || undefined,
        modelNumber: pModelNumber.trim(),
        mainImage: resolvedMainImage || undefined,
        mainImagePosition: `${pMainPosX}% ${pMainPosY}%`,
        mainImageFit: pMainFit,
        additionalImages: undefined,
        description: pDescription.trim(),
        availableSizes: availableSizes.length > 0 ? availableSizes : undefined,
        dimensions: pDimensions.trim() || undefined,
        materialDetails: pMaterial.trim() || undefined,
        specifications: specifications.length > 0 ? specifications : undefined,
        gnSize: pGnSize.trim() || undefined,
        productType: pProductType || undefined,
        matchingLidId: pMatchingLidId.trim() || undefined,
        variants: pVariants.length > 0 ? pVariants : undefined,
        packagingInfo: pPackagingInfo.trim() || undefined,
        filterTags: pFilterTags.length > 0 ? pFilterTags : undefined,
        isAvailable: Boolean(pIsAvailable),
        relatedProductIds: pRelatedIds.length > 0 ? pRelatedIds : undefined,
        featured: Boolean(pFeatured),
        sortOrder: Number(pSortOrder) || 1,
      };

      await saveProductRecordToFirestore(productPayload, existingFirestoreDoc);
      setFeedback(
        editingId
          ? `Updated & published "${pName.trim()}" permanently to Firestore catalogue.`
          : `Saved & published "${pName.trim()}" permanently to Firestore catalogue.`
      );
      resetProductForm();
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? `Failed to save product: ${err.message}`
          : 'Failed to save product. Please check your connection and field values.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setFeedback(`Deleted product "${name}".`);
      if (editingId === productId) resetProductForm();
    } catch (err) {
      setFeedback('Could not delete product.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
      } catch {
        // Logged
      }
    }
  };

  const handleUpdateEnquiryStatus = async (
    enquiryId: string,
    status: EnquiryStatus,
    adminNotes?: string
  ) => {
    try {
      await updateDoc(doc(db, 'enquiries', enquiryId), {
        status,
        ...(adminNotes !== undefined ? { adminNotes: adminNotes.slice(0, 2000) } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setFeedback('Failed to update enquiry status.');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `enquiries/${enquiryId}`);
      } catch {
        // Logged
      }
    }
  };

  const handleDeleteEnquiry = async (enquiryId: string) => {
    try {
      await deleteDoc(doc(db, 'enquiries', enquiryId));
      setFeedback(`Removed enquiry ${enquiryId}.`);
    } catch (err) {
      setFeedback('Could not delete enquiry.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `enquiries/${enquiryId}`);
      } catch {
        // Logged
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);
    try {
      const payload = {
        emailPlaceholder: settingsDraft.emailPlaceholder.slice(0, 160),
        phonePlaceholder: settingsDraft.phonePlaceholder.slice(0, 60),
        whatsappNumber: settingsDraft.whatsappNumber.slice(0, 40),
        addressPlaceholder: settingsDraft.addressPlaceholder.slice(0, 400),
        aboutOverview: settingsDraft.aboutOverview.slice(0, 3000),
        manufacturingCapabilities: settingsDraft.manufacturingCapabilities.slice(0, 2000),
        qualityCommitment: settingsDraft.qualityCommitment.slice(0, 2000),
        industryExperience: settingsDraft.industryExperience.slice(0, 2000),
        customerCommitment: settingsDraft.customerCommitment.slice(0, 2000),
        showPlaceholderSlots: Boolean(settingsDraft.showPlaceholderSlots),
        showPrices: settingsDraft.showPrices !== false,
      };
      await updateSettings(payload);
      setFeedback('Company profile and contact settings saved permanently.');
    } catch (err) {
      setFeedback('Failed to save settings.');
      try {
        handleFirestoreError(err, OperationType.WRITE, 'settings/public_profile');
      } catch {
        // Logged
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredEnquiries =
    statusFilter === 'all'
      ? enquiries
      : enquiries.filter((e) => e.status === statusFilter);

  return (
    <div className="bg-white min-h-[75vh]">
      {/* Top Admin Header */}
      <section className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 py-8">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018]">
              Administration
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-black mt-1">
              Catalogue &amp; Enquiry Management
            </h1>
            <p className="text-xs text-[#292321]/70 mt-1">
              {user ? (
                <>
                  Signed in as <span className="font-mono">{user.email}</span>
                </>
              ) : (
                'Direct access enabled for uploading images, videos, products, and content'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                activeTab === 'products'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#B8B8B3] hover:border-black'
              }`}
            >
              Products ({products.filter((p) => !p.isPlaceholder).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                activeTab === 'content'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#B8B8B3] hover:border-black'
              }`}
            >
              Website Content &amp; About Us
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                activeTab === 'media'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#B8B8B3] hover:border-black'
              }`}
            >
              Image Library ({mediaAssets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('enquiries')}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                activeTab === 'enquiries'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#B8B8B3] hover:border-black'
              }`}
            >
              Enquiries ({enquiries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border transition-colors ${
                activeTab === 'settings'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#B8B8B3] hover:border-black'
              }`}
            >
              Company Settings
            </button>
            {user && (
              <button
                type="button"
                onClick={signOutAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase border border-[#B8B8B3] bg-white text-[#292321] hover:border-black"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
        {feedback && (
          <div className="mb-8 p-4 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[#5B1018] font-semibold uppercase ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Add / Edit Product Form */}
            <form
              onSubmit={handleSaveProduct}
              className="lg:col-span-5 border border-[#B8B8B3]/80 bg-white p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#B8B8B3]/50 pb-3">
                <h2 className="font-display text-lg font-semibold text-black">
                  {editingId ? 'Edit Product' : 'Upload New Product'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="text-xs font-semibold uppercase text-[#5B1018] hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Enter exact product name"
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Category *
                  </label>
                  <select
                    value={pCategory}
                    onChange={(e) =>
                      setPCategory(e.target.value as ProductCategoryId)
                    }
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm bg-white focus:border-black focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={pModelNumber}
                    onChange={(e) => setPModelNumber(e.target.value)}
                    placeholder="e.g. TSL-81"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Sub-Category / Line
                  </label>
                  <input
                    type="text"
                    value={pSubCategory}
                    onChange={(e) => setPSubCategory(e.target.value)}
                    placeholder="e.g. Electric Fryer Range"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Brand Line
                  </label>
                  <input
                    type="text"
                    value={pBrandLine}
                    onChange={(e) => setPBrandLine(e.target.value)}
                    placeholder="e.g. THE SILVER LINING"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Single Product Photograph */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.06em]">
                  Product Photograph (1 Image per Product)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!(pStagedPreviewUrl || pMainImage) ? (
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Preparing...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage || savingProduct}
                        onChange={handleMainImageSelect}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[11px] font-semibold uppercase cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Preparing...' : 'Replace Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage || savingProduct}
                        onChange={handleMainImageSelect}
                        className="sr-only"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setProductLibraryOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-black text-[11px] font-semibold uppercase hover:bg-[#F5F5F5]"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Library</span>
                  </button>
                  {(pStagedPreviewUrl || pMainImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPMainImage('');
                        setPStagedFile(null);
                        setPStagedPreviewUrl('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-[#5B1018] text-[#5B1018] text-[11px] font-semibold uppercase hover:bg-[#F3E7DA]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                  {(pStagedPreviewUrl || pMainImage) && (
                    <button
                      type="submit"
                      disabled={savingProduct || uploadingImage}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#5B1018] text-white text-[11px] font-semibold uppercase hover:bg-[#430b11] disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingProduct ? 'Saving...' : 'Save Image'}</span>
                    </button>
                  )}
                </div>
                {pStagedPreviewUrl && (
                  <p className="text-[11px] font-semibold text-[#5B1018] bg-[#F3E7DA] border border-[#5B1018]/50 px-2.5 py-1.5">
                    Image preview ready — click SAVE IMAGE above (or SAVE / PUBLISH at the bottom) to save permanently.
                  </p>
                )}
                {(pStagedPreviewUrl || pMainImage) && (
                  <div className="space-y-2">
                    <div className="h-44 border border-[#B8B8B3]/60 bg-[#F5F5F5] overflow-hidden">
                      <ProductVisual
                        src={pStagedPreviewUrl || pMainImage}
                        alt={pName || 'Product Photograph Preview'}
                        position={`${pMainPosX}% ${pMainPosY}%`}
                        fit={pMainFit}
                      />
                    </div>
                    <div className="border border-[#B8B8B3]/60 bg-[#F5F5F5] p-2.5 space-y-2 text-[11px]">
                      <p className="font-semibold uppercase tracking-[0.05em] text-black">
                        Adjust Image Position
                      </p>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <span className="font-mono">X: {pMainPosX}%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={pMainPosX}
                            onChange={(e) => setPMainPosX(Number(e.target.value))}
                            className="w-full accent-[#5B1018]"
                          />
                        </div>
                        <div>
                          <span className="font-mono">Y: {pMainPosY}%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={pMainPosY}
                            onChange={(e) => setPMainPosY(Number(e.target.value))}
                            className="w-full accent-[#5B1018]"
                          />
                        </div>
                        <select
                          aria-label="Image Fit"
                          value={pMainFit}
                          onChange={(e) =>
                            setPMainFit(e.target.value as 'contain' | 'cover')
                          }
                          className="px-2 py-1 border border-[#B8B8B3] bg-white text-xs"
                        >
                          <option value="contain">Original Fit (Contain)</option>
                          <option value="cover">Fill Container (Cover)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Accurate product overview and intended application..."
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Available Sizes (Comma-separated)
                </label>
                <input
                  type="text"
                  value={pSizesText}
                  onChange={(e) => setPSizesText(e.target.value)}
                  placeholder="e.g. 500ml, 1000ml, 1500ml"
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={pDimensions}
                    onChange={(e) => setPDimensions(e.target.value)}
                    placeholder="e.g. 530 × 325 mm"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Material Details
                  </label>
                  <input
                    type="text"
                    value={pMaterial}
                    onChange={(e) => setPMaterial(e.target.value)}
                    placeholder="Actual stainless grade / finish"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Packaging & Kitchenware Filter Classification */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Packaging Information (Separate from Individual Product Weight)
                </label>
                <input
                  type="text"
                  value={pPackagingInfo}
                  onChange={(e) => setPPackagingInfo(e.target.value)}
                  placeholder="e.g. Bulk carton packaging details (max 300 chars)"
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-black focus:outline-none"
                />
              </div>

              {pCategory === 'kitchenware-home-utility' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Kitchenware Filter Tags
                  </label>
                  <div className="flex flex-wrap gap-3 border border-[#B8B8B3]/70 bg-[#F5F5F5] p-3">
                    {KITCHENWARE_FILTER_TYPES.map((tag) => {
                      if (tag.id === 'all') return null;
                      const tagId: KitchenwareFilterTag = tag.id;
                      const checked = pFilterTags.includes(tagId);
                      return (
                        <label
                          key={tagId}
                          className="inline-flex items-center gap-1.5 text-xs text-[#292321]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPFilterTags((prev) => [...prev, tagId]);
                              } else {
                                setPFilterTags((prev) =>
                                  prev.filter((t) => t !== tagId)
                                );
                              }
                            }}
                          />
                          <span>{tag.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variants, Weights & Pricing Editor (GN Pans & Kitchenware) */}
              {(pCategory === 'gn-pans' ||
                pCategory === 'kitchenware-home-utility' ||
                pVariants.length > 0 ||
                pProductType !== '') && (
                <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#B8B8B3]/50 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
                      Variants, Weights &amp; Classification
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPVariants((prev) => [
                          ...prev,
                          {
                            label: '',
                            modelCode: '',
                            variantGroup: '',
                            depthMm: '',
                            dimensionsMm: '',
                            dimensionsIn: '',
                            capacity: '',
                            individualWeight: '',
                            packagingWeight: '',
                            packingQty: '',
                            ...(pCategory === 'gn-pans' ? { netPrice: 0 } : {}),
                          },
                        ])
                      }
                      className="text-xs font-semibold uppercase text-[#5B1018] hover:underline"
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-1">
                        Product Type
                      </label>
                      <select
                        value={pProductType}
                        onChange={(e) =>
                          setPProductType(e.target.value as ProductType | '')
                        }
                        className="w-full px-2.5 py-1.5 border border-[#B8B8B3] text-xs bg-white focus:border-black focus:outline-none"
                      >
                        <option value="">Standard</option>
                        <option value="gn-pan">GN Pan</option>
                        <option value="gn-lid">GN Pan Cover</option>
                        <option value="ice-cream-pan">Ice Cream Pan</option>
                        <option value="equipment">Commercial Equipment</option>
                        <option value="kitchenware">Kitchenware</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-1">
                        GN Size
                      </label>
                      <input
                        type="text"
                        value={pGnSize}
                        onChange={(e) => setPGnSize(e.target.value)}
                        placeholder="e.g. 1/1, 2/1, 1/6"
                        className="w-full px-2.5 py-1.5 border border-[#B8B8B3] text-xs bg-white focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-1">
                        Matching Lid ID
                      </label>
                      <input
                        type="text"
                        value={pMatchingLidId}
                        onChange={(e) => setPMatchingLidId(e.target.value)}
                        placeholder="e.g. gn-lid-1-1"
                        className="w-full px-2.5 py-1.5 border border-[#B8B8B3] text-xs font-mono bg-white focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  {pVariants.length > 0 && (
                    <div className="space-y-3">
                      {pVariants.map((variant, vIdx) => (
                        <div
                          key={vIdx}
                          className="bg-white border border-[#B8B8B3]/70 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-semibold text-[#5B1018]">
                              Variant #{vIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPVariants((prev) =>
                                  prev.filter((_, i) => i !== vIdx)
                                )
                              }
                              className="text-xs text-[#292321]/60 hover:text-[#5B1018]"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={variant.label}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx ? { ...row, label: e.target.value } : row
                                  )
                                )
                              }
                              placeholder="Unique Label (e.g. NO. 1 (0.4&quot; Height))"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.modelCode || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, modelCode: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Model Number (e.g. NO. 1)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.variantGroup || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, variantGroup: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Group / Height (e.g. 0.4 inch)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.dimensionsIn || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, dimensionsIn: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder='Dimensions Inches (8.4" × 12.4" × 1")'
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.dimensionsMm || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, dimensionsMm: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Dimensions mm (optional)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.depthMm || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx ? { ...row, depthMm: e.target.value } : row
                                  )
                                )
                              }
                              placeholder="Depth mm (e.g. 65 MM)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.individualWeight || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, individualWeight: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Individual Weight (e.g. 425g)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.packagingWeight || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, packagingWeight: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Packaging Weight (separate)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.packingQty || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, packingQty: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Packing Qty (e.g. 24 PCS)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={variant.capacity || ''}
                              onChange={(e) =>
                                setPVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === vIdx
                                      ? { ...row, capacity: e.target.value }
                                      : row
                                  )
                                )
                              }
                              placeholder="Capacity (optional, e.g. 9.5 L)"
                              className="px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono"
                            />
                            <input
                              type="number"
                              min={0}
                              value={
                                typeof variant.netPrice === 'number'
                                  ? variant.netPrice
                                  : ''
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                setPVariants((prev) =>
                                  prev.map((row, i) => {
                                    if (i !== vIdx) return row;
                                    if (raw === '') {
                                      const next = { ...row };
                                      delete next.netPrice;
                                      return next;
                                    }
                                    return {
                                      ...row,
                                      netPrice: Math.max(0, Number(raw) || 0),
                                    };
                                  })
                                );
                              }}
                              placeholder="Net Price ₹ (optional)"
                              className="col-span-2 px-2 py-1.5 border border-[#B8B8B3] text-xs font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em]">
                    Specifications
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPSpecs((prev) => [...prev, { label: '', value: '' }])
                    }
                    className="text-xs font-semibold uppercase text-[#5B1018] hover:underline"
                  >
                    + Add Row
                  </button>
                </div>
                {pSpecs.map((spec, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={spec.label}
                      onChange={(e) =>
                        setPSpecs((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, label: e.target.value } : row
                          )
                        )
                      }
                      placeholder="Label"
                      className="col-span-5 px-2.5 py-1.5 border border-[#B8B8B3] text-xs focus:border-black focus:outline-none"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) =>
                        setPSpecs((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, value: e.target.value } : row
                          )
                        )
                      }
                      placeholder="Value"
                      className="col-span-6 px-2.5 py-1.5 border border-[#B8B8B3] text-xs focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPSpecs((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 text-xs text-[#292321]/60 hover:text-[#5B1018]"
                      aria-label="Remove spec row"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Related Products Selection */}
              {products.some((p) => !p.isPlaceholder) && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Related Products
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-[#B8B8B3]/70 p-2.5 space-y-1.5">
                    {products
                      .filter((rp) => !rp.isPlaceholder && rp.id !== editingId)
                      .map((rp) => (
                        <label
                          key={rp.id}
                          className="flex items-center gap-2 text-xs text-[#292321]"
                        >
                          <input
                            type="checkbox"
                            checked={pRelatedIds.includes(rp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPRelatedIds((prev) => [...prev, rp.id]);
                              } else {
                                setPRelatedIds((prev) =>
                                  prev.filter((id) => id !== rp.id)
                                );
                              }
                            }}
                          />
                          <span>
                            {rp.name} ({rp.modelNumber || rp.category})
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#B8B8B3]/40">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-black">
                    <input
                      type="checkbox"
                      checked={pFeatured}
                      onChange={(e) => setPFeatured(e.target.checked)}
                    />
                    <span>Feature on Homepage</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-black">
                    <input
                      type="checkbox"
                      checked={pIsAvailable}
                      onChange={(e) => setPIsAvailable(e.target.checked)}
                    />
                    <span>Available for Ordering</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#292321]/70">Sort Order:</label>
                  <input
                    type="number"
                    value={pSortOrder}
                    onChange={(e) => setPSortOrder(Number(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-[#B8B8B3] text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              {showProductPreview && (
                <div className="border border-black bg-[#F5F5F5] p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                    Product Card Preview (Before Publishing)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 aspect-[4/3] border border-[#B8B8B3] bg-white overflow-hidden">
                      <ProductVisual
                        src={pStagedPreviewUrl || pMainImage}
                        alt={pName || 'Product Preview'}
                        modelNumber={pModelNumber}
                        position={`${pMainPosX}% ${pMainPosY}%`}
                        fit={pMainFit}
                      />
                    </div>
                    <div className="sm:col-span-7 space-y-1">
                      <p className="font-display text-base font-semibold text-black">
                        {pName || 'Untitled Product'}
                      </p>
                      <p className="text-xs font-mono text-[#292321]/75">
                        {pModelNumber || 'No model'} · {pSubCategory || pCategory}
                      </p>
                      <p className="text-xs text-[#292321]/85 line-clamp-3">
                        {pDescription}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#B8B8B3]/50 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
                >
                  CANCEL
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductPreview((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showProductPreview ? 'HIDE PREVIEW' : 'PREVIEW'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct || uploadingImage}
                    className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
                  >
                    {savingProduct ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct || uploadingImage}
                    className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
                  >
                    PUBLISH
                  </button>
                </div>
              </div>
            </form>

            {/* Active Catalogue Products — Product-wise Image Upload & Management */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#B8B8B3]/60 pb-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-black">
                    Active Catalogue Products (
                    {products.filter((p) => !p.isPlaceholder).length})
                  </h2>
                  <p className="text-[11px] text-[#292321]/70">
                    Upload one photograph per product, preview before publishing, replace, or delete anytime.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder="Search product or model..."
                    className="px-3 py-1.5 border border-[#B8B8B3] text-xs bg-white focus:border-black focus:outline-none w-44"
                  />
                  <select
                    aria-label="Filter products by category"
                    value={adminCatFilter}
                    onChange={(e) => setAdminCatFilter(e.target.value)}
                    className="px-3 py-1.5 border border-[#B8B8B3] text-xs bg-white focus:border-black focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {Object.keys(stagedRowImages).length > 0 && (
                <div className="sticky top-2 z-20 p-3.5 bg-[#F3E7DA] border-2 border-[#5B1018] shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-black">
                    {Object.keys(stagedRowImages).length} uploaded product image
                    {Object.keys(stagedRowImages).length === 1 ? '' : 's'} waiting to be saved permanently
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(rowBusyId)}
                      onClick={handleCancelAllStagedRowImages}
                      className="px-3 py-1.5 border border-black bg-white text-[11px] font-semibold uppercase text-black hover:bg-[#F5F5F5]"
                    >
                      Discard All
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(rowBusyId)}
                      onClick={handleSaveAllStagedRowImages}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-black disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {rowBusyId
                          ? 'Saving...'
                          : `Save All Images (${Object.keys(stagedRowImages).length})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const q = adminSearchQuery.trim().toLowerCase();
                const activeList = products.filter((p) => {
                  if (p.isPlaceholder) return false;
                  if (adminCatFilter !== 'all' && p.category !== adminCatFilter) {
                    return false;
                  }
                  if (!q) return true;
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.modelNumber || '').toLowerCase().includes(q) ||
                    (p.subCategory || '').toLowerCase().includes(q)
                  );
                });
                if (activeList.length === 0) {
                  return (
                    <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-8 space-y-2">
                      <p className="font-display text-base font-semibold text-black">
                        No products match this filter
                      </p>
                      <p className="text-sm text-[#292321]/80">
                        Adjust your search or category filter, or add a product using the form on the left.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {activeList.map((prod) => {
                      const inFirestore = realProducts.some((r) => r.id === prod.id);
                      const staged = stagedRowImages[prod.id];
                      const activeSrc = staged?.previewUrl || prod.mainImage;
                      const isRowBusy = rowBusyId === prod.id;
                      const hasSavedImage = Boolean(prod.mainImage);

                      return (
                        <div
                          key={prod.id}
                          className={`border bg-white p-4 space-y-3 ${
                            staged ? 'border-[#5B1018]' : 'border-[#B8B8B3]/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-20 h-20 border border-[#B8B8B3]/60 bg-[#F5F5F5] shrink-0 overflow-hidden">
                                <ProductVisual
                                  src={activeSrc}
                                  alt={prod.name}
                                  modelNumber={prod.modelNumber}
                                  position={prod.mainImagePosition}
                                  fit={staged?.fit || prod.mainImageFit}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.06em] text-[#5B1018] font-semibold">
                                  {prod.subCategory || getCategoryMeta(prod.category).title}
                                </p>
                                <p className="text-sm font-semibold text-black truncate">
                                  {prod.name}
                                </p>
                                <p className="text-xs font-mono text-[#292321]/70 tabular-nums">
                                  {prod.modelNumber || 'No model number'}
                                  {staged
                                    ? ' · Preview Ready (Unpublished)'
                                    : hasSavedImage
                                    ? ' · Live Image Saved'
                                    : ' · Image Pending Upload'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditProduct(prod)}
                                className="p-2 border border-[#B8B8B3] text-[#292321] hover:border-black"
                                aria-label={`Edit ${prod.name}`}
                                title="Edit full product details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {inFirestore && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="p-2 border border-[#B8B8B3] text-[#5B1018] hover:border-[#5B1018]"
                                  aria-label={`Delete ${prod.name}`}
                                  title="Delete custom product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Product-Wise Single Image Upload & Management Controls */}
                          <div className="pt-2.5 border-t border-[#F5F5F5] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {!activeSrc ? (
                                <label
                                  htmlFor={`product-image-upload-${prod.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-semibold uppercase tracking-[0.05em] cursor-pointer hover:bg-[#292321]"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>{isRowBusy ? 'Loading...' : 'Upload Image'}</span>
                                  <input
                                    id={`product-image-upload-${prod.id}`}
                                    type="file"
                                    accept="image/*"
                                    disabled={isRowBusy}
                                    onChange={(e) => handleRowImageSelect(prod, e)}
                                    className="sr-only"
                                  />
                                </label>
                              ) : (
                                <label
                                  htmlFor={`product-image-upload-${prod.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-black text-[11px] font-semibold uppercase tracking-[0.05em] cursor-pointer hover:bg-[#F5F5F5]"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>{isRowBusy ? 'Loading...' : 'Replace Image'}</span>
                                  <input
                                    id={`product-image-upload-${prod.id}`}
                                    type="file"
                                    accept="image/*"
                                    disabled={isRowBusy}
                                    onChange={(e) => handleRowImageSelect(prod, e)}
                                    className="sr-only"
                                  />
                                </label>
                              )}

                              {activeSrc && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalProductId(prod.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#B8B8B3] bg-white text-black text-[11px] font-semibold uppercase tracking-[0.05em] hover:border-black"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>
                              )}

                              {hasSavedImage && (
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => handleDeleteRowImage(prod)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#5B1018] text-[#5B1018] text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-[#F3E7DA] disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete Image</span>
                                </button>
                              )}
                            </div>

                            {staged && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => handleCancelRowPreview(prod.id)}
                                  className="px-3 py-1.5 border border-[#B8B8B3] bg-white text-[11px] font-semibold uppercase text-black hover:border-black"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => handlePublishRowImage(prod)}
                                  className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#5B1018] text-white text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-[#430b11] disabled:opacity-60"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>
                                    {isRowBusy ? 'Saving...' : 'Save & Publish Image'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: WEBSITE CONTENT & ABOUT US */}
        {activeTab === 'content' && (
          <div className="space-y-10">
            <HeroVideoManager />
            <CategoryAndBrandEditor />
            <div className="border border-[#B8B8B3]/80 bg-white p-6">
              <AboutEditorPanel />
            </div>
          </div>
        )}

        {/* TAB 3: CENTRAL IMAGE LIBRARY */}
        {activeTab === 'media' && <ImageLibraryPanel />}

        {/* TAB 2: ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#B8B8B3]/60 pb-4">
              <h2 className="font-display text-lg font-semibold text-black">
                Submitted Quotation Enquiries ({filteredEnquiries.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'new', 'reviewed', 'quoted', 'closed'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] border ${
                        statusFilter === st
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-[#292321] border-[#B8B8B3]'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {!isAuthenticatedAdmin ? (
              <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-8 text-center space-y-4">
                <p className="text-sm text-[#292321]/85">
                  Customer quotation enquiries contain contact details and require Google sign-in ({BOOTSTRAPPED_ADMIN_EMAIL}) to view.
                </p>
                <button
                  type="button"
                  onClick={signInAdmin}
                  className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-black transition-colors"
                >
                  Sign In with Google to View Enquiries
                </button>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-10 text-center text-sm text-[#292321]/75">
                No quotation enquiries found for this filter.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEnquiries.map((enq) => (
                  <div
                    key={enq.id}
                    className="border border-[#B8B8B3]/80 bg-white p-6 space-y-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#F5F5F5] pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs text-[#5B1018] font-semibold">
                            {enq.id}
                          </span>
                          <span className="text-xs uppercase font-semibold tracking-[0.06em] text-[#292321]">
                            Status: {enq.status}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-black">
                          {enq.companyName} — {enq.name}
                        </h3>
                        <p className="text-xs text-[#292321]/80">
                          {enq.email} · {enq.phone} · {enq.city}, {enq.country}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Status for ${enq.id}`}
                          value={enq.status}
                          onChange={(e) =>
                            handleUpdateEnquiryStatus(
                              enq.id,
                              e.target.value as EnquiryStatus,
                              enq.adminNotes
                            )
                          }
                          className="px-3 py-1.5 border border-black text-xs font-semibold uppercase bg-white"
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="quoted">Quoted</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteEnquiry(enq.id)}
                          className="p-2 border border-[#B8B8B3] text-[#5B1018] hover:border-[#5B1018]"
                          aria-label={`Delete enquiry ${enq.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {enq.message && (
                      <p className="text-sm text-[#292321]/85 bg-[#F5F5F5] p-3.5 border border-[#B8B8B3]/40">
                        {enq.message}
                      </p>
                    )}

                    <div className="overflow-x-auto border border-[#B8B8B3]/60">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 uppercase tracking-[0.06em]">
                            <th className="py-2.5 px-3 font-semibold">Category</th>
                            <th className="py-2.5 px-3 font-semibold">Product</th>
                            <th className="py-2.5 px-3 font-semibold">Model / Size</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                            <th className="py-2.5 px-3 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#B8B8B3]/40">
                          {enq.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 px-3">
                                {getCategoryMeta(item.category).title}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-black">
                                {item.productName}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums">
                                {item.modelOrSize}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-[#292321]/75">
                                {item.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPANY SETTINGS & EMAIL CONFIG */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <form
              onSubmit={handleSaveSettings}
              className="lg:col-span-8 border border-[#B8B8B3]/80 bg-white p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-display text-lg font-semibold text-black border-b border-[#B8B8B3]/50 pb-3">
                Editable Contact Information &amp; Company Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Public Contact Email
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.emailPlaceholder}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        emailPlaceholder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    Public Phone Number
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.phonePlaceholder}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        phonePlaceholder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                    WhatsApp Number (Digits with country code)
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.whatsappNumber}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        whatsappNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. 919800000000"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-black">
                    <input
                      type="checkbox"
                      checked={settingsDraft.showPrices !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          showPrices: e.target.checked,
                        })
                      }
                    />
                    <span>Display Net Prices (₹ / pc) on Website</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#292321]">
                    <input
                      type="checkbox"
                      checked={settingsDraft.showPlaceholderSlots}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          showPlaceholderSlots: e.target.checked,
                        })
                      }
                    />
                    <span>Show Placeholder Slots for Empty Categories</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Factory / Office Address
                </label>
                <input
                  type="text"
                  value={settingsDraft.addressPlaceholder}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      addressPlaceholder: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  About Us Overview
                </label>
                <textarea
                  rows={3}
                  value={settingsDraft.aboutOverview}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      aboutOverview: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Manufacturing Capabilities
                </label>
                <textarea
                  rows={2}
                  value={settingsDraft.manufacturingCapabilities}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      manufacturingCapabilities: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Product Quality Commitment
                </label>
                <textarea
                  rows={2}
                  value={settingsDraft.qualityCommitment}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      qualityCommitment: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Industry Experience
                </label>
                <textarea
                  rows={2}
                  value={settingsDraft.industryExperience}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      industryExperience: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Commitment to B2B Customers
                </label>
                <textarea
                  rows={2}
                  value={settingsDraft.customerCommitment}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      customerCommitment: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#B8B8B3] text-sm"
                />
              </div>

              {showSettingsPreview && (
                <div className="border border-black bg-[#F5F5F5] p-4 space-y-1.5 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                    Company Settings Preview
                  </p>
                  <p>
                    <strong>Email:</strong> {settingsDraft.emailPlaceholder}
                  </p>
                  <p>
                    <strong>Phone:</strong> {settingsDraft.phonePlaceholder}
                  </p>
                  <p>
                    <strong>Address:</strong> {settingsDraft.addressPlaceholder}
                  </p>
                  <p>
                    <strong>About Overview:</strong> {settingsDraft.aboutOverview}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#B8B8B3]/50 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsDraft({
                      ...settings,
                      showPrices: settings.showPrices ?? true,
                    });
                    setShowSettingsPreview(false);
                    setFeedback('Cancelled unsaved company settings edits.');
                  }}
                  className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
                >
                  CANCEL
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsPreview((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showSettingsPreview ? 'HIDE PREVIEW' : 'PREVIEW'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
                  >
                    {savingSettings ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
                  >
                    PUBLISH
                  </button>
                </div>
              </div>
            </form>

            <div className="lg:col-span-4 border border-[#B8B8B3]/80 bg-[#F5F5F5] p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-black">
                Email Notification Integration
              </h3>
              <p className="text-xs text-[#292321]/80 leading-relaxed">
                Status:{' '}
                <strong className="text-black">
                  {smtpConfigured === null
                    ? 'Checking...'
                    : smtpConfigured
                    ? 'SMTP Active — Quotation emails enabled'
                    : 'Awaiting SMTP Configuration'}
                </strong>
              </p>
              <p className="text-xs text-[#292321]/75 leading-relaxed">
                Every quotation submission is always stored securely in Firestore and
                visible in the Enquiries tab. Once your company email credentials are
                ready, configure the following environment variables in your deployment
                secrets to enable automatic email alerts:
              </p>
              <ul className="font-mono text-[11px] bg-white border border-[#B8B8B3]/60 p-3 space-y-1 text-[#292321]">
                <li>SMTP_HOST</li>
                <li>SMTP_PORT</li>
                <li>SMTP_USER</li>
                <li>SMTP_PASS</li>
                <li>COMPANY_NOTIFICATION_EMAIL</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Product Image Preview Modal (Before Publishing) */}
      {(() => {
        if (!previewModalProductId) return null;
        const prod = products.find((p) => p.id === previewModalProductId);
        if (!prod) return null;
        const staged = stagedRowImages[prod.id];
        const previewSrc = staged?.previewUrl || prod.mainImage;
        const previewBusy = rowBusyId === prod.id;

        return (
          <div
            className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPreviewModalProductId(null)}
          >
            <div
              className="bg-white border border-black max-w-2xl w-full p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#B8B8B3]/60 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                    {staged
                      ? 'Product Image Preview (Before Publishing)'
                      : 'Published Product Image'}
                  </p>
                  <h3 className="font-display text-xl font-semibold text-black">
                    {prod.name}
                  </h3>
                  <p className="text-xs font-mono text-[#292321]/70">
                    {prod.modelNumber || getCategoryMeta(prod.category).title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalProductId(null)}
                  className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-[4/3] border border-[#B8B8B3] bg-[#F5F5F5] overflow-hidden">
                <ProductVisual
                  src={previewSrc}
                  alt={prod.name}
                  modelNumber={prod.modelNumber}
                  position={prod.mainImagePosition}
                  fit={staged?.fit || prod.mainImageFit}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#B8B8B3]/50">
                <p className="text-xs text-[#292321]/75">
                  Original proportions and image clarity preserved for product card &amp; detail page.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalProductId(null)}
                    className="px-4 py-2 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase text-black hover:border-black"
                  >
                    Close
                  </button>
                  {staged && (
                    <button
                      type="button"
                      disabled={previewBusy}
                      onClick={async () => {
                        await handlePublishRowImage(prod);
                        setPreviewModalProductId(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.05em] hover:bg-[#430b11] disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{previewBusy ? 'Publishing...' : 'Save & Publish Image'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ImageLibraryModal
        open={productLibraryOpen}
        initialUsage={getUsageForCategory(pCategory)}
        onSelectImage={(refUrl) => {
          setPStagedFile(null);
          setPStagedPreviewUrl('');
          setPMainImage(refUrl);
          setFeedback(
            'Image selected from library. Click SAVE or PUBLISH to update product.'
          );
        }}
        onClose={() => setProductLibraryOpen(false)}
      />
    </div>
  );
}
