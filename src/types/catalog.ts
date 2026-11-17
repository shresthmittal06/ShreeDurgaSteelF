export type ProductCategoryId =
  | 'kitchenware-home-utility'
  | 'gn-pans'
  | 'commercial-kitchen-equipment';

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductVariant {
  label: string;
  modelCode?: string;
  variantGroup?: string;
  depthMm?: string;
  dimensionsMm?: string;
  dimensionsIn?: string;
  capacity?: string;
  individualWeight?: string;
  packagingWeight?: string;
  packingQty?: string;
  netPrice?: number;
}

export type ProductType =
  | 'gn-pan'
  | 'gn-lid'
  | 'ice-cream-pan'
  | 'equipment'
  | 'kitchenware';

export type KitchenwareFilterTag =
  | 'trays'
  | 'sweet-shop'
  | 'storage'
  | 'pooja'
  | 'household'
  | 'special';

export interface Product {
  id: string;
  name: string;
  category: ProductCategoryId;
  subCategory?: string;
  brandLine?: string;
  modelNumber: string;
  mainImage?: string;
  mainImagePosition?: string;
  mainImageFit?: 'contain' | 'cover';
  additionalImages?: string[];
  description: string;
  availableSizes?: string[];
  dimensions?: string;
  materialDetails?: string;
  specifications?: ProductSpecification[];
  gnSize?: string;
  productType?: ProductType;
  matchingLidId?: string;
  variants?: ProductVariant[];
  packagingInfo?: string;
  filterTags?: KitchenwareFilterTag[];
  isAvailable?: boolean;
  relatedProductIds?: string[];
  featured: boolean;
  sortOrder: number;
  isPlaceholder?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MediaUsage =
  | 'branding'
  | 'homepage'
  | 'about'
  | 'kitchenware'
  | 'gn-pans'
  | 'commercial-kitchen'
  | 'general';

export const MEDIA_USAGE_OPTIONS: { id: MediaUsage; label: string }[] = [
  { id: 'branding', label: 'Company Logo' },
  { id: 'homepage', label: 'Homepage Images' },
  { id: 'about', label: 'About Us & Factory Photographs' },
  { id: 'kitchenware', label: 'Kitchenware & Home Utility' },
  { id: 'gn-pans', label: 'GN Pans & Accessories' },
  { id: 'commercial-kitchen', label: 'Commercial Kitchen Equipment' },
  { id: 'general', label: 'Other Website Images' },
];

export interface MediaAsset {
  id: string;
  name: string;
  usage: MediaUsage;
  dataUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  altText?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MediaFormat = 'image' | 'video';

export interface ImageSlotValue {
  src?: string;
  alt?: string;
  position?: string;
  fit?: 'cover' | 'contain';
  deleted?: boolean;
  mediaType?: MediaFormat;
  videoId?: string;
}

export interface CategoryOverride {
  title?: string;
  navLabel?: string;
  shortDescription?: string;
  fullDescription?: string;
  image?: string;
  imagePosition?: string;
  imageFit?: 'cover' | 'contain';
  mediaType?: MediaFormat;
  videoId?: string;
}

export interface AboutPhotoItem {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
  position?: string;
  fit?: 'cover' | 'contain';
  mediaType?: MediaFormat;
  videoId?: string;
}

export interface AboutContentBlock {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface WhyChooseItem {
  index: string;
  title: string;
  description: string;
}

export type VideoVariant = 'desktop' | 'mobile' | 'section';

export interface VideoAsset {
  id: string;
  name: string;
  variant: VideoVariant;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  status: 'active' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VideoChunk {
  id: string;
  index: number;
  data: string;
  createdAt?: unknown;
}

export interface SiteContent {
  id: 'published' | 'draft';
  textOverrides?: Record<string, string>;
  extraParagraphs?: Record<string, string[]>;
  imageOverrides?: Record<string, ImageSlotValue>;
  categoryOverrides?: Record<string, CategoryOverride>;
  whyChooseItems?: WhyChooseItem[];
  aboutIntroParagraphs?: string[];
  aboutBlocks?: AboutContentBlock[];
  aboutPhotos?: AboutPhotoItem[];
  aboutImagePlacement?: 'left' | 'right';
  logoUrl?: string;
  logoAlt?: string;
  logoPosition?: string;
  logoDeleted?: boolean;
  heroVideoId?: string;
  heroMobileVideoId?: string;
  heroPreviousVideoId?: string;
  heroPreviousMobileVideoId?: string;
  heroOverlayOpacity?: number;
  heroMediaType?: MediaFormat;
  updatedAt?: unknown;
}

export const BUILTIN_WEBSITE_IMAGES: {
  id: string;
  name: string;
  usage: MediaUsage;
  src: string;
}[] = [
  {
    id: 'builtin-hero',
    name: 'Homepage Hero Stainless Collection',
    usage: 'homepage',
    src: '/src/assets/images/hero_stainless_manufacturing_1794728248058.jpg',
  },
  {
    id: 'builtin-about',
    name: 'About Us & Factory Manufacturing Craft',
    usage: 'about',
    src: '/src/assets/images/about_manufacturing_craft_1794728250935.jpg',
  },
  {
    id: 'builtin-cat-kitchenware',
    name: 'Category Card – Kitchenware & Home Utility',
    usage: 'kitchenware',
    src: '/src/assets/images/category_kitchenware_utility_1794728249070.jpg',
  },
  {
    id: 'builtin-cat-gn-pans',
    name: 'Category Card – GN Pans & Accessories',
    usage: 'gn-pans',
    src: '/src/assets/images/category_gn_pans_1794728248987.jpg',
  },
  {
    id: 'builtin-cat-commercial',
    name: 'Category Card – Commercial Kitchen Equipment',
    usage: 'commercial-kitchen',
    src: '/src/assets/images/category_commercial_kitchen_1794728249594.jpg',
  },
];

export interface EnquiryItem {
  productId?: string;
  category: string;
  productName: string;
  modelOrSize: string;
  quantity: number;
  notes?: string;
}

export type EnquiryStatus = 'new' | 'reviewed' | 'quoted' | 'closed';

export interface Enquiry {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  message?: string;
  items: EnquiryItem[];
  status: EnquiryStatus;
  adminNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface FooterContactItem {
  id: string;
  label: string;
  value: string;
  type?: 'address' | 'email' | 'phone' | 'custom';
}

export interface FooterConfig {
  categoryLinks?: FooterLinkItem[];
  companyLinks?: FooterLinkItem[];
  contactItems?: FooterContactItem[];
  whatsappNumber?: string;
  whatsappMessage?: string;
  whatsappButtonLabel?: string;
  showWhatsAppButton?: boolean;
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  categoryLinks: [
    {
      id: 'cat-kitchenware',
      label: 'Kitchenware & Home Utility',
      url: '/products/kitchenware-home-utility',
    },
    {
      id: 'cat-gn-pans',
      label: 'GN Pans & Accessories',
      url: '/products/gn-pans',
    },
    {
      id: 'cat-commercial',
      label: 'Commercial Kitchen Equipment',
      url: '/products/commercial-kitchen-equipment',
    },
    {
      id: 'cat-all',
      label: 'All Products',
      url: '/products',
    },
  ],
  companyLinks: [
    { id: 'comp-about', label: 'About Us', url: '/about' },
    { id: 'comp-quote', label: 'Get a Quote', url: '/quote' },
    { id: 'comp-admin', label: 'Product & Enquiry Management', url: '/admin' },
  ],
  contactItems: [
    {
      id: 'cont-address',
      label: 'Factory & Head Office',
      value:
        'In-front of Ganesh City Colony, Kalwari Road, Near FCI Godown, Hathras, Uttar Pradesh 204101',
      type: 'address',
    },
    {
      id: 'cont-email',
      label: 'Email',
      value: 'infoshridurgasteels@gmail.com',
      type: 'email',
    },
    {
      id: 'cont-phone',
      label: 'Phone',
      value: '+91 9997890127',
      type: 'phone',
    },
  ],
  whatsappNumber: '919997890127',
  whatsappMessage:
    'Hello SHREE DURGA STEELS, I would like to enquire about your stainless steel products and request a quotation.',
  whatsappButtonLabel: 'WhatsApp Enquiry',
  showWhatsAppButton: true,
};

export interface SiteSettings {
  emailPlaceholder: string;
  phonePlaceholder: string;
  whatsappNumber: string;
  addressPlaceholder: string;
  aboutOverview: string;
  manufacturingCapabilities: string;
  qualityCommitment: string;
  industryExperience: string;
  customerCommitment: string;
  showPlaceholderSlots: boolean;
  showPrices: boolean;
  footerConfig?: FooterConfig;
  updatedAt?: unknown;
}

export interface CategoryMeta {
  id: ProductCategoryId;
  title: string;
  navLabel: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'kitchenware-home-utility',
    title: 'Kitchenware & Home Utility',
    navLabel: 'Kitchenware & Home Utility',
    shortDescription:
      'Precision-crafted stainless steel culinary vessels, canisters, servingware, and everyday utility essentials.',
    fullDescription:
      'Explore our stainless steel kitchenware and home utility range designed for consistent finish, everyday durability, and B2B wholesale supply.',
    image: '/src/assets/images/category_kitchenware_utility_1794728249070.jpg',
  },
  {
    id: 'gn-pans',
    title: 'GN Pans & Accessories',
    navLabel: 'GN Pans',
    shortDescription:
      'Standardised gastronorm containers, perforated trays, and fitted lids engineered for commercial foodservice.',
    fullDescription:
      'Explore our stainless steel GN pans and accessories structured for hotels, catering operations, central kitchens, and institutional buyers.',
    image: '/src/assets/images/category_gn_pans_1794728248987.jpg',
  },
  {
    id: 'commercial-kitchen-equipment',
    title: 'Commercial Kitchen Equipment',
    navLabel: 'Commercial Kitchen Equipment',
    shortDescription:
      'Heavy-duty stainless steel prep tables, shelving systems, sinks, and foodservice fabrication.',
    fullDescription:
      'Explore our commercial kitchen equipment line built for hospitality kitchens, restaurants, canteens, and industrial food preparation facilities.',
    image: '/src/assets/images/category_commercial_kitchen_1794728249594.jpg',
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  emailPlaceholder: 'infoshridurgasteels@gmail.com',
  phonePlaceholder: '+91 9997890127',
  whatsappNumber: '919997890127',
  addressPlaceholder:
    'In-front of Ganesh City Colony, Kalwari Road, Near FCI Godown, Hathras, Uttar Pradesh 204101',
  aboutOverview:
    'SHREE DURGA STEELS is a dedicated stainless steel manufacturing and B2B supply enterprise focused on delivering dependable kitchenware, home utility products, GN pans, and commercial kitchen equipment.',
  manufacturingCapabilities:
    'Advanced hydraulic presses, deep drawing machinery, precision sheet forming, robotic polishing, and stringent quality control.',
  qualityCommitment:
    'Food-grade AISI 304 & 200 series stainless steel certification, uniform gauge thickness, mirror and satin dual finishing.',
  industryExperience:
    'Decades of reliable manufacturing excellence supplying hospitality chains, commercial kitchens, caterers, and wholesale distributors nationwide.',
  customerCommitment:
    'We partner closely with wholesalers, distributors, hotels, restaurants, and commercial buyers to provide transparent specifications, reliable order fulfilment, and responsive quotation support.',
  showPlaceholderSlots: true,
  showPrices: true,
  footerConfig: DEFAULT_FOOTER_CONFIG,
};

export function formatInrPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Temporary structured placeholder slots shown ONLY until actual products are uploaded
 * via the Product Management System. Zero invented dimensions, grades, or specs.
 */
export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: 'placeholder-kw-01',
    name: 'Kitchenware Product Slot 01 (Pending Upload)',
    category: 'kitchenware-home-utility',
    modelNumber: 'MODEL-PENDING-KW01',
    description:
      'Structured product placeholder for Kitchenware & Home Utility. Actual product name, photograph, model number, available sizes, and specifications can be uploaded through the Product Management System.',
    availableSizes: ['Size details pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'Available Sizes', value: 'To be updated' },
      { label: 'Material & Finish', value: 'To be updated' },
      { label: 'Minimum Order Qty', value: 'On enquiry' },
    ],
    featured: true,
    sortOrder: 1,
    isPlaceholder: true,
  },
  {
    id: 'placeholder-kw-02',
    name: 'Home Utility Product Slot 02 (Pending Upload)',
    category: 'kitchenware-home-utility',
    modelNumber: 'MODEL-PENDING-KW02',
    description:
      'Structured product placeholder for Kitchenware & Home Utility. Upload actual photography, sizing matrix, and technical specifications via the Management Portal.',
    availableSizes: ['Size details pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'Available Sizes', value: 'To be updated' },
      { label: 'Material & Finish', value: 'To be updated' },
      { label: 'Packaging', value: 'To be updated' },
    ],
    featured: true,
    sortOrder: 2,
    isPlaceholder: true,
  },
  {
    id: 'placeholder-gn-01',
    name: 'GN Pan Product Slot 01 (Pending Upload)',
    category: 'gn-pans',
    modelNumber: 'MODEL-PENDING-GN01',
    description:
      'Structured product placeholder for GN Pans & Accessories. Ready for actual GN size listings, depths, lid compatibility, and genuine product photography.',
    availableSizes: ['GN sizes pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'GN Format / Depth', value: 'To be updated' },
      { label: 'Material & Gauge', value: 'To be updated' },
      { label: 'Lid Compatibility', value: 'To be updated' },
    ],
    featured: true,
    sortOrder: 3,
    isPlaceholder: true,
  },
  {
    id: 'placeholder-gn-02',
    name: 'GN Accessory Product Slot 02 (Pending Upload)',
    category: 'gn-pans',
    modelNumber: 'MODEL-PENDING-GN02',
    description:
      'Structured product placeholder for GN Pans & Accessories. Replace this slot with actual catalogue entries in the Product Management System.',
    availableSizes: ['GN sizes pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'Available Sizes', value: 'To be updated' },
      { label: 'Finish', value: 'To be updated' },
    ],
    featured: true,
    sortOrder: 4,
    isPlaceholder: true,
  },
  {
    id: 'placeholder-ck-01',
    name: 'Commercial Equipment Slot 01 (Pending Upload)',
    category: 'commercial-kitchen-equipment',
    modelNumber: 'MODEL-PENDING-CK01',
    description:
      'Structured product placeholder for Commercial Kitchen Equipment. Ready for actual equipment dimensions, fabrication details, and product photographs.',
    availableSizes: ['Configurations pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'Standard Sizes', value: 'To be updated' },
      { label: 'Construction', value: 'To be updated' },
    ],
    featured: true,
    sortOrder: 5,
    isPlaceholder: true,
  },
  {
    id: 'placeholder-ck-02',
    name: 'Commercial Equipment Slot 02 (Pending Upload)',
    category: 'commercial-kitchen-equipment',
    modelNumber: 'MODEL-PENDING-CK02',
    description:
      'Structured product placeholder for Commercial Kitchen Equipment. Actual product photography and specifications can be uploaded anytime.',
    availableSizes: ['Configurations pending'],
    dimensions: 'Dimensions pending actual specification',
    materialDetails: 'Material grade pending actual specification',
    specifications: [
      { label: 'Model Number', value: 'To be updated' },
      { label: 'Dimensions', value: 'To be updated' },
      { label: 'Application', value: 'To be updated' },
    ],
    featured: true,
    sortOrder: 6,
    isPlaceholder: true,
  },
];

export function getCategoryMeta(categoryId: string): CategoryMeta {
  return CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
}
