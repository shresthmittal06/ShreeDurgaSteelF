import React, { useMemo, useState } from 'react';
import {
  Building,
  FolderTree,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Settings,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CompanyLogo } from './CompanyLogo';
import { EditableText } from './EditableText';
import { FooterCustomizerModal } from './FooterCustomizerModal';
import {
  DEFAULT_FOOTER_CONFIG,
  type FooterConfig,
  type FooterContactItem,
  type FooterLinkItem,
} from '../types/catalog';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const {
    settings,
    categoriesWithOverrides,
    getWhatsAppUrl,
    isAdmin,
    toggleAdminMode,
    updateSettings,
  } = useStore();

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<
    'whatsapp' | 'categories' | 'company' | 'contact'
  >('whatsapp');

  // Quick inline add states for admin mode
  const [quickAddColumn, setQuickAddColumn] = useState<
    'categories' | 'company' | 'contact' | null
  >(null);
  const [quickLinkLabel, setQuickLinkLabel] = useState('');
  const [quickLinkUrl, setQuickLinkUrl] = useState('');
  const [quickContactType, setQuickContactType] = useState<
    'address' | 'email' | 'phone' | 'custom'
  >('phone');
  const [quickContactLabel, setQuickContactLabel] = useState('');
  const [quickContactValue, setQuickContactValue] = useState('');

  // Resolved Footer Configuration
  const footerConfig: FooterConfig = useMemo(() => {
    return settings.footerConfig || DEFAULT_FOOTER_CONFIG;
  }, [settings.footerConfig]);

  const categoryLinks: FooterLinkItem[] = useMemo(() => {
    if (footerConfig.categoryLinks && footerConfig.categoryLinks.length > 0) {
      return footerConfig.categoryLinks;
    }
    return DEFAULT_FOOTER_CONFIG.categoryLinks || [];
  }, [footerConfig.categoryLinks]);

  const companyLinks: FooterLinkItem[] = useMemo(() => {
    if (footerConfig.companyLinks && footerConfig.companyLinks.length > 0) {
      return footerConfig.companyLinks;
    }
    return DEFAULT_FOOTER_CONFIG.companyLinks || [];
  }, [footerConfig.companyLinks]);

  const contactItems: FooterContactItem[] = useMemo(() => {
    if (footerConfig.contactItems && footerConfig.contactItems.length > 0) {
      return footerConfig.contactItems;
    }
    return DEFAULT_FOOTER_CONFIG.contactItems || [];
  }, [footerConfig.contactItems]);

  const currentWhatsAppNumber =
    footerConfig.whatsappNumber || settings.whatsappNumber || '919997890127';
  const whatsappButtonLabel = footerConfig.whatsappButtonLabel || 'WhatsApp Enquiry';
  const showWhatsAppButton = footerConfig.showWhatsAppButton !== false;

  const handleLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  const openCustomizer = (tab: 'whatsapp' | 'categories' | 'company' | 'contact') => {
    setCustomizerTab(tab);
    setIsCustomizerOpen(true);
  };

  // Quick removal handlers for inline admin action
  const handleRemoveCategoryLink = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = categoryLinks.filter((l) => l.id !== id);
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        categoryLinks: updated,
      },
    });
  };

  const handleRemoveCompanyLink = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = companyLinks.filter((l) => l.id !== id);
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        companyLinks: updated,
      },
    });
  };

  const handleRemoveContactItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = contactItems.filter((item) => item.id !== id);
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        contactItems: updated,
      },
    });
  };

  // Inline Add Category Link
  const handleQuickAddCategory = async () => {
    if (!quickLinkLabel.trim()) return;
    const newLink: FooterLinkItem = {
      id: `cat-${Date.now()}`,
      label: quickLinkLabel.trim(),
      url: quickLinkUrl.trim() || '/products',
    };
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        categoryLinks: [...categoryLinks, newLink],
      },
    });
    setQuickLinkLabel('');
    setQuickLinkUrl('');
    setQuickAddColumn(null);
  };

  // Inline Add Company Link
  const handleQuickAddCompany = async () => {
    if (!quickLinkLabel.trim()) return;
    const newLink: FooterLinkItem = {
      id: `comp-${Date.now()}`,
      label: quickLinkLabel.trim(),
      url: quickLinkUrl.trim() || '/about',
    };
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        companyLinks: [...companyLinks, newLink],
      },
    });
    setQuickLinkLabel('');
    setQuickLinkUrl('');
    setQuickAddColumn(null);
  };

  // Inline Add Contact Item
  const handleQuickAddContact = async () => {
    if (!quickContactValue.trim()) return;
    const newItem: FooterContactItem = {
      id: `contact-${Date.now()}`,
      type: quickContactType,
      label:
        quickContactLabel.trim() ||
        (quickContactType === 'phone'
          ? 'Phone'
          : quickContactType === 'email'
          ? 'Email'
          : quickContactType === 'address'
          ? 'Address'
          : 'Details'),
      value: quickContactValue.trim(),
    };
    await updateSettings({
      footerConfig: {
        ...footerConfig,
        contactItems: [...contactItems, newItem],
      },
    });
    setQuickContactLabel('');
    setQuickContactValue('');
    setQuickAddColumn(null);
  };

  // Modal Save Handler
  const handleSaveFromModal = async (updatedConfig: FooterConfig, newWhatsappNumber: string) => {
    await updateSettings({
      whatsappNumber: newWhatsappNumber,
      footerConfig: updatedConfig,
    });
  };

  return (
    <footer className="bg-black text-white border-t border-[#292321] relative">
      {/* Admin Mode Quick Bar */}
      {isAdmin && (
        <div className="bg-[#181818] border-b border-[#5B1018] px-4 sm:px-6 lg:px-10 py-2.5">
          <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#D8BFA8]">
              <Settings className="w-4 h-4 text-[#D8BFA8]" />
              <span className="font-semibold uppercase tracking-wider">
                Footer Editor Active:
              </span>
              <span className="text-white/70 hidden sm:inline">
                You can add or remove links &amp; contact info, or update the WhatsApp enquiry number.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCustomizer('whatsapp')}
                className="px-3 py-1 bg-[#5B1018] hover:bg-[#430b11] text-white font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp No: {currentWhatsAppNumber}</span>
              </button>
              <button
                type="button"
                onClick={() => openCustomizer('categories')}
                className="px-3 py-1 bg-white/10 hover:bg-white hover:text-black text-white font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage All Footer Items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-[#B8B8B3]/25">
          {/* Column 1: Brand & Intro */}
          <div className="space-y-4">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              className="inline-flex items-center gap-3"
            >
              <CompanyLogo variant="dark" className="w-8 h-8 shrink-0" />
              <EditableText
                id="brand.name"
                defaultText="SHREE DURGA STEELS"
                label="Company Brand Name"
                allowDelete={false}
                className="font-display text-base font-semibold tracking-[0.06em] text-white whitespace-nowrap"
              />
            </a>
            <EditableText
              id="footer.tagline"
              defaultText="Precision stainless steel manufacturing and B2B supply of kitchenware, home utility products, GN pans, and commercial kitchen equipment."
              label="Footer Company Tagline"
              as="p"
              multiline
              allowExtraParagraphs
              extraParagraphClassName="text-sm text-[#B8B8B3] leading-relaxed mt-2"
              className="text-sm text-[#B8B8B3] leading-relaxed"
            />
          </div>

          {/* Column 2: Product Categories */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <EditableText
                id="footer.colCategoriesHeading"
                defaultText="Product Categories"
                label="Footer Column 2 Heading"
                as="h3"
                className="text-xs font-semibold tracking-[0.08em] uppercase text-white"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setQuickAddColumn(quickAddColumn === 'categories' ? null : 'categories')
                  }
                  className="text-[11px] uppercase tracking-wider text-[#D8BFA8] hover:text-white inline-flex items-center gap-1 underline underline-offset-2"
                  title="Add Category Link"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Quick Add Form: Categories */}
            {isAdmin && quickAddColumn === 'categories' && (
              <div className="mb-4 p-3 bg-white/5 border border-[#5B1018] space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Link Label (e.g. Storage Vessels)"
                  value={quickLinkLabel}
                  onChange={(e) => setQuickLinkLabel(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs focus:border-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="URL Path (e.g. /products)"
                  value={quickLinkUrl}
                  onChange={(e) => setQuickLinkUrl(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs font-mono focus:border-white focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickAddColumn(null)}
                    className="px-2 py-0.5 text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="px-2.5 py-0.5 bg-[#5B1018] text-white font-semibold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <ul className="space-y-3 text-sm text-[#B8B8B3]">
              {categoryLinks.map((item) => (
                <li key={item.id} className="group flex items-center justify-between gap-2">
                  <a
                    href={item.url}
                    onClick={(e) => handleLink(e, item.url)}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveCategoryLink(item.id, e)}
                      className="opacity-60 hover:opacity-100 text-[#5B1018] hover:text-red-400 p-0.5 transition-opacity"
                      title={`Remove "${item.label}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company & Enquiries */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <EditableText
                id="footer.colCompanyHeading"
                defaultText="Company"
                label="Footer Column 3 Heading"
                as="h3"
                className="text-xs font-semibold tracking-[0.08em] uppercase text-white"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setQuickAddColumn(quickAddColumn === 'company' ? null : 'company')
                  }
                  className="text-[11px] uppercase tracking-wider text-[#D8BFA8] hover:text-white inline-flex items-center gap-1 underline underline-offset-2"
                  title="Add Company Link"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Quick Add Form: Company */}
            {isAdmin && quickAddColumn === 'company' && (
              <div className="mb-4 p-3 bg-white/5 border border-[#5B1018] space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Link Label (e.g. Certifications)"
                  value={quickLinkLabel}
                  onChange={(e) => setQuickLinkLabel(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs focus:border-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="URL Path (e.g. /about or /quote)"
                  value={quickLinkUrl}
                  onChange={(e) => setQuickLinkUrl(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs font-mono focus:border-white focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickAddColumn(null)}
                    className="px-2 py-0.5 text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddCompany}
                    className="px-2.5 py-0.5 bg-[#5B1018] text-white font-semibold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <ul className="space-y-3 text-sm text-[#B8B8B3]">
              {companyLinks
                .filter((item) => isAdmin || item.url !== '/admin')
                .map((item) => (
                <li key={item.id} className="group flex items-center justify-between gap-2">
                  <a
                    href={item.url}
                    onClick={(e) => handleLink(e, item.url)}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveCompanyLink(item.id, e)}
                      className="opacity-60 hover:opacity-100 text-[#5B1018] hover:text-red-400 p-0.5 transition-opacity"
                      title={`Remove "${item.label}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <EditableText
                id="footer.colContactHeading"
                defaultText="Contact & Enquiries"
                label="Footer Column 4 Heading"
                as="h3"
                className="text-xs font-semibold tracking-[0.08em] uppercase text-white"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setQuickAddColumn(quickAddColumn === 'contact' ? null : 'contact')
                  }
                  className="text-[11px] uppercase tracking-wider text-[#D8BFA8] hover:text-white inline-flex items-center gap-1 underline underline-offset-2"
                  title="Add Contact Detail"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Quick Add Form: Contact */}
            {isAdmin && quickAddColumn === 'contact' && (
              <div className="mb-4 p-3 bg-white/5 border border-[#5B1018] space-y-2 text-xs">
                <select
                  value={quickContactType}
                  onChange={(e) =>
                    setQuickContactType(
                      e.target.value as 'address' | 'email' | 'phone' | 'custom'
                    )
                  }
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs focus:border-white focus:outline-none"
                >
                  <option value="phone">Phone / Mobile</option>
                  <option value="email">Email Address</option>
                  <option value="address">Address</option>
                  <option value="custom">Other / Custom</option>
                </select>
                <input
                  type="text"
                  placeholder="Label (e.g. Sales Enquiry or Plant 2)"
                  value={quickContactLabel}
                  onChange={(e) => setQuickContactLabel(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs focus:border-white focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Value / Content..."
                  value={quickContactValue}
                  onChange={(e) => setQuickContactValue(e.target.value)}
                  className="w-full px-2 py-1 bg-black border border-[#B8B8B3] text-white text-xs focus:border-white focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickAddColumn(null)}
                    className="px-2 py-0.5 text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddContact}
                    className="px-2.5 py-0.5 bg-[#5B1018] text-white font-semibold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm text-[#B8B8B3]">
              {contactItems.map((item) => (
                <div key={item.id} className="group flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    {item.label && item.label !== 'Address' && (
                      <span className="text-white/60 block text-xs uppercase tracking-wider">
                        {item.label}
                      </span>
                    )}
                    <p className="leading-relaxed whitespace-pre-line text-[#B8B8B3] group-hover:text-white transition-colors">
                      {item.value}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveContactItem(item.id, e)}
                      className="opacity-60 hover:opacity-100 text-[#5B1018] hover:text-red-400 p-0.5 transition-opacity shrink-0 mt-0.5"
                      title={`Remove "${item.label}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* WhatsApp Enquiry Button */}
              <div className="pt-3">
                {showWhatsAppButton && (
                  <a
                    href={getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#B8B8B3]/60 text-xs font-semibold tracking-[0.06em] uppercase text-white hover:bg-white hover:text-black transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>{whatsappButtonLabel}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Line & Controls */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#B8B8B3]/80">
          <EditableText
            id="footer.copyright"
            defaultText={`© ${new Date().getFullYear()} SHREE DURGA STEELS. All rights reserved.`}
            label="Footer Copyright Line"
            as="p"
          />
          <div className="flex flex-wrap items-center gap-3">
            <EditableText
              id="footer.bottomNote"
              defaultText="Stainless Steel Manufacturing & B2B Commercial Supply"
              label="Footer Bottom Note"
              as="p"
            />

            {/* Direct Admin & Customizer triggers: ONLY visible when admin mode is activated */}
            {isAdmin && (
              <>
                <span aria-hidden="true" className="text-[#B8B8B3]/40">·</span>
                <button
                  type="button"
                  onClick={() => setIsCustomizerOpen(true)}
                  className="text-[11px] uppercase tracking-wider text-[#D8BFA8] hover:text-white transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1 font-semibold"
                  title="Customize footer links, contact info, and WhatsApp number"
                >
                  <Settings className="w-3 h-3" />
                  <span>Customize Footer &amp; WhatsApp</span>
                </button>

                <span aria-hidden="true" className="text-[#B8B8B3]/40">·</span>
                <button
                  type="button"
                  onClick={() => toggleAdminMode(false)}
                  className="text-[11px] uppercase tracking-wider text-[#B8B8B3]/60 hover:text-white transition-colors underline-offset-4 hover:underline"
                  title="Exit Admin Mode"
                >
                  Exit Admin Mode
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full Modal Customizer */}
      <FooterCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={footerConfig}
        currentPhonePlaceholder={settings.phonePlaceholder}
        onSave={handleSaveFromModal}
        initialTab={customizerTab}
      />
    </footer>
  );
}
