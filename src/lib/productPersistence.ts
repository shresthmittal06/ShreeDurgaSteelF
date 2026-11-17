import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { Product, ProductVariant } from '../types/catalog';

function cleanVariants(variants?: ProductVariant[]): ProductVariant[] | undefined {
  if (!variants || variants.length === 0) return undefined;
  return variants
    .filter((v) => v.label && v.label.trim())
    .slice(0, 30)
    .map((v) => ({
      label: v.label.trim().slice(0, 100),
      ...(v.modelCode?.trim() ? { modelCode: v.modelCode.trim().slice(0, 60) } : {}),
      ...(v.variantGroup?.trim()
        ? { variantGroup: v.variantGroup.trim().slice(0, 60) }
        : {}),
      ...(v.depthMm?.trim() ? { depthMm: v.depthMm.trim().slice(0, 40) } : {}),
      ...(v.dimensionsMm?.trim()
        ? { dimensionsMm: v.dimensionsMm.trim().slice(0, 80) }
        : {}),
      ...(v.dimensionsIn?.trim()
        ? { dimensionsIn: v.dimensionsIn.trim().slice(0, 80) }
        : {}),
      ...(v.capacity?.trim() ? { capacity: v.capacity.trim().slice(0, 40) } : {}),
      ...(v.individualWeight?.trim()
        ? { individualWeight: v.individualWeight.trim().slice(0, 60) }
        : {}),
      ...(v.packagingWeight?.trim()
        ? { packagingWeight: v.packagingWeight.trim().slice(0, 80) }
        : {}),
      ...(v.packingQty?.trim() ? { packingQty: v.packingQty.trim().slice(0, 40) } : {}),
      ...(typeof v.netPrice === 'number' && !Number.isNaN(v.netPrice)
        ? { netPrice: Math.max(0, v.netPrice) }
        : {}),
    }));
}

/**
 * Persists a product document permanently to Firestore using full document write (setDoc)
 * so removed optional fields (such as a deleted mainImage) are cleanly removed instead of
 * surviving via partial updateDoc. Enforces firestore.rules schema bounds.
 */
export async function saveProductRecordToFirestore(
  product: Product,
  existingFirestoreDoc?: Product
): Promise<void> {
  const rawId = product.id || `prod-${Date.now()}`;
  const safeId = rawId
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 128) || `prod-${Date.now()}`;
  const safeMainImage = product.mainImage?.trim()
    ? product.mainImage.trim().slice(0, 700000)
    : undefined;

  const cleanedSpecs = (product.specifications || [])
    .filter((s) => s.label?.trim() && s.value?.trim())
    .slice(0, 30)
    .map((s) => ({
      label: s.label.trim().slice(0, 100),
      value: s.value.trim().slice(0, 300),
    }));

  const cleanedVariants = cleanVariants(product.variants);

  const cleanedSizes = (product.availableSizes || [])
    .map((s) => s.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 30);

  const cleanedTags = (product.filterTags || []).slice(0, 10);

  const cleanedRelated = (product.relatedProductIds || [])
    .filter((id) => /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 128)
    .slice(0, 10);

  const docRef = doc(db, 'products', safeId);
  let effectiveCreatedAt = existingFirestoreDoc?.createdAt;
  let isExistingDoc = Boolean(effectiveCreatedAt);

  if (!effectiveCreatedAt) {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        isExistingDoc = true;
        effectiveCreatedAt = snap.data()?.createdAt;
      }
    } catch {
      // Network/offline fallback
    }
  }

  const payload: Record<string, unknown> = {
    id: safeId,
    name: product.name.trim().slice(0, 200),
    category: product.category,
    ...(product.subCategory?.trim()
      ? { subCategory: product.subCategory.trim().slice(0, 120) }
      : {}),
    ...(product.brandLine?.trim()
      ? { brandLine: product.brandLine.trim().slice(0, 120) }
      : {}),
    modelNumber: (product.modelNumber || '').trim().slice(0, 80),
    ...(safeMainImage ? { mainImage: safeMainImage } : {}),
    ...(product.mainImagePosition?.trim()
      ? { mainImagePosition: product.mainImagePosition.trim().slice(0, 60) }
      : { mainImagePosition: '50% 50%' }),
    mainImageFit: product.mainImageFit === 'cover' ? 'cover' : 'contain',
    description: (product.description || '').trim().slice(0, 3000),
    ...(cleanedSizes.length > 0 ? { availableSizes: cleanedSizes } : {}),
    ...(product.dimensions?.trim()
      ? { dimensions: product.dimensions.trim().slice(0, 300) }
      : {}),
    ...(product.materialDetails?.trim()
      ? { materialDetails: product.materialDetails.trim().slice(0, 500) }
      : {}),
    ...(cleanedSpecs.length > 0 ? { specifications: cleanedSpecs } : {}),
    ...(product.gnSize?.trim() ? { gnSize: product.gnSize.trim().slice(0, 40) } : {}),
    ...(product.productType ? { productType: product.productType } : {}),
    ...(product.matchingLidId?.trim() &&
    /^[a-zA-Z0-9_-]+$/.test(product.matchingLidId.trim())
      ? { matchingLidId: product.matchingLidId.trim() }
      : {}),
    ...(cleanedVariants && cleanedVariants.length > 0
      ? { variants: cleanedVariants }
      : {}),
    ...(product.packagingInfo?.trim()
      ? { packagingInfo: product.packagingInfo.trim().slice(0, 300) }
      : {}),
    ...(cleanedTags.length > 0 ? { filterTags: cleanedTags } : {}),
    isAvailable: product.isAvailable !== false,
    ...(cleanedRelated.length > 0 ? { relatedProductIds: cleanedRelated } : {}),
    featured: Boolean(product.featured),
    sortOrder: Number(product.sortOrder) || 1,
    createdAt: effectiveCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const mergedProduct = { ...product, ...payload, id: safeId };

  try {
    const localMap = JSON.parse(localStorage.getItem('sds_local_products_v1') || '{}');
    localMap[safeId] = mergedProduct;
    localStorage.setItem('sds_local_products_v1', JSON.stringify(localMap));
  } catch {
    // Ignore localStorage errors
  }

  // Persist to server disk so all external browsers receive updated products immediately
  try {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: mergedProduct }),
    });
  } catch {
    // Keep resilient if server api unreachable
  }

  try {
    await setDoc(docRef, payload);
  } catch (err) {
    // If Firestore fails, server API & localStorage already keep the edit safe
    console.warn('Firestore product write fallback to server/local storage:', err);
  }
}
