# Security Specification — SHREE DURGA STEELS

## 1. Data Invariants
1. **Product Integrity**: Every document in `/products/{productId}` must have a valid alphanumeric/hyphen/underscore `id` matching the document ID, a valid category (`kitchenware-home-utility`, `gn-pans`, or `commercial-kitchen-equipment`), bounded string sizes, and valid server timestamps. Only verified administrators may create, update, or delete products.
2. **Enquiry PII Isolation**: Customer quotation enquiries in `/enquiries/{enquiryId}` contain sensitive B2B contact details (`email`, `phone`, `companyName`). Any visitor may submit a new enquiry with `status == 'new'`, `createdAt == request.time`, and valid line items (`1..25`), but ONLY verified administrators may `get`, `list`, `update`, or `delete` enquiries.
3. **Immutable Audit Fields**: `id` and `createdAt` cannot be modified after creation on both `/products` and `/enquiries`.
4. **Admin Verification**: Administrative access strictly requires `request.auth != null && request.auth.token.email_verified == true` AND either the bootstrapped admin email (`infoshridurgasteels@gmail.com`) or existence in `/admins/{uid}`.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. Unauthenticated product creation -> PERMISSION_DENIED
2. Non-admin authenticated user attempting product update -> PERMISSION_DENIED
3. Unverified email matching admin address attempting product delete -> PERMISSION_DENIED
4. Shadow field injection (`isAdmin: true`) on `/enquiries` create -> PERMISSION_DENIED
5. Pre-set non-new status (`status: 'quoted'`) on `/enquiries` create -> PERMISSION_DENIED
6. Client-spoofed `createdAt` timestamp on `/enquiries` create -> PERMISSION_DENIED
7. Oversized `productId` (> 128 chars or invalid regex) on `/products` write -> PERMISSION_DENIED
8. Unauthenticated `get` on `/enquiries/{enquiryId}` (PII leak attempt) -> PERMISSION_DENIED
9. Non-admin `list` query on `/enquiries` (PII scraping attempt) -> PERMISSION_DENIED
10. Empty `items` array (`items: []`) on `/enquiries` create -> PERMISSION_DENIED
11. Modifying `createdAt` or `id` on `/products` update -> PERMISSION_DENIED
12. Creating `/settings/private_secret` outside `public_profile` by non-admin -> PERMISSION_DENIED
