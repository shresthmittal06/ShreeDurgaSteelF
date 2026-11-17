import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  FolderTree,
  Building,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Clock,
  FileText,
} from 'lucide-react';
import {
  DEFAULT_FOOTER_CONFIG,
  type FooterConfig,
  type FooterContactItem,
  type FooterLinkItem,
} from '../types/catalog';

interface FooterCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FooterConfig;
  currentPhonePlaceholder?: string;
  onSave: (updatedConfig: FooterConfig, whatsappNumber: string) => Promise<void>;
  initialTab?: 'whatsapp' | 'categories' | 'company' | 'contact';
}

export function FooterCustomizerModal({
  isOpen,
  onClose,
  config,
  currentPhonePlaceholder = '+91 9997890127',
  onSave,
  initialTab = 'whatsapp',
}: FooterCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'categories' | 'company' | 'contact'>(
    initialTab
  );

  // Draft states
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    config.whatsappNumber || '919997890127'
  );
  const [whatsappMessage, setWhatsappMessage] = useState<string>(
    config.whatsappMessage ||
      'Hello SHREE DURGA STEELS, I would like to enquire about your stainless steel products and request a quotation.'
  );
  const [whatsappButtonLabel, setWhatsappButtonLabel] = useState<string>(
    config.whatsappButtonLabel || 'WhatsApp Enquiry'
  );
  const [showWhatsAppButton, setShowWhatsAppButton] = useState<boolean>(
    config.showWhatsAppButton !== false
  );

  const [categoryLinks, setCategoryLinks] = useState<FooterLinkItem[]>(
    config.categoryLinks && config.categoryLinks.length > 0
      ? config.categoryLinks
      : DEFAULT_FOOTER_CONFIG.categoryLinks || []
  );

  const [companyLinks, setCompanyLinks] = useState<FooterLinkItem[]>(
    config.companyLinks && config.companyLinks.length > 0
      ? config.companyLinks
      : DEFAULT_FOOTER_CONFIG.companyLinks || []
  );

  const [contactItems, setContactItems] = useState<FooterContactItem[]>(
    config.contactItems && config.contactItems.length > 0
      ? config.contactItems
      : DEFAULT_FOOTER_CONFIG.contactItems || []
  );

  // New item inputs
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatUrl, setNewCatUrl] = useState('');

  const [newCompLabel, setNewCompLabel] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');

  const [newContactType, setNewContactType] = useState<
    'address' | 'email' | 'phone' | 'custom'
  >('phone');
  const [newContactLabel, setNewContactLabel] = useState('');
  const [newContactValue, setNewContactValue] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute test whatsapp URL
  const cleanPhone = (whatsappNumber || '').replace(/[^0-9]/g, '');
  const formattedTestPhone =
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919997890127';
  const testWhatsAppUrl = `https://wa.me/${formattedTestPhone}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  // Category Link Actions
  const handleAddCategoryLink = () => {
    if (!newCatLabel.trim()) return;
    const newLink: FooterLinkItem = {
      id: `cat-${Date.now()}`,
      label: newCatLabel.trim(),
      url: newCatUrl.trim() || '/products',
    };
    setCategoryLinks([...categoryLinks, newLink]);
    setNewCatLabel('');
    setNewCatUrl('');
  };

  const handleRemoveCategoryLink = (id: string) => {
    setCategoryLinks(categoryLinks.filter((item) => item.id !== id));
  };

  // Company Link Actions
  const handleAddCompanyLink = () => {
    if (!newCompLabel.trim()) return;
    const newLink: FooterLinkItem = {
      id: `comp-${Date.now()}`,
      label: newCompLabel.trim(),
      url: newCompUrl.trim() || '/about',
    };
    setCompanyLinks([...companyLinks, newLink]);
    setNewCompLabel('');
    setNewCompUrl('');
  };

  const handleRemoveCompanyLink = (id: string) => {
    setCompanyLinks(companyLinks.filter((item) => item.id !== id));
  };

  // Contact Item Actions
  const handleAddContactItem = () => {
    if (!newContactValue.trim()) return;
    const newItem: FooterContactItem = {
      id: `contact-${Date.now()}`,
      type: newContactType,
      label:
        newContactLabel.trim() ||
        (newContactType === 'phone'
          ? 'Phone'
          : newContactType === 'email'
          ? 'Email'
          : newContactType === 'address'
          ? 'Address'
          : 'Details'),
      value: newContactValue.trim(),
    };
    setContactItems([...contactItems, newItem]);
    setNewContactLabel('');
    setNewContactValue('');
  };

  const handleRemoveContactItem = (id: string) => {
    setContactItems(contactItems.filter((item) => item.id !== id));
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all footer links, contact items, and WhatsApp settings to defaults?')) {
      setWhatsappNumber(DEFAULT_FOOTER_CONFIG.whatsappNumber || '919997890127');
      setWhatsappMessage(
        DEFAULT_FOOTER_CONFIG.whatsappMessage ||
          'Hello SHREE DURGA STEELS, I would like to enquire about your stainless steel products and request a quotation.'
      );
      setWhatsappButtonLabel(DEFAULT_FOOTER_CONFIG.whatsappButtonLabel || 'WhatsApp Enquiry');
      setShowWhatsAppButton(true);
      setCategoryLinks(DEFAULT_FOOTER_CONFIG.categoryLinks || []);
      setCompanyLinks(DEFAULT_FOOTER_CONFIG.companyLinks || []);
      setContactItems(DEFAULT_FOOTER_CONFIG.contactItems || []);
      setSuccessMessage('Reset to defaults. Click "Save All Changes" to persist.');
    }
  };

  // Save
  const handleSaveAll = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const updated: FooterConfig = {
        categoryLinks,
        companyLinks,
        contactItems,
        whatsappNumber: whatsappNumber.trim(),
        whatsappMessage: whatsappMessage.trim(),
        whatsappButtonLabel: whatsappButtonLabel.trim(),
        showWhatsAppButton,
      };
      await onSave(updated, whatsappNumber.trim());
      setSuccessMessage('Footer settings & WhatsApp number updated successfully across website!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch {
      alert('Failed to save footer settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white text-[#292321] w-full max-w-3xl rounded-none shadow-2xl border border-[#B8B8B3] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-[#5B1018]">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-[#D8BFA8]" />
            <div>
              <h2 className="font-display text-base font-semibold tracking-wide uppercase">
                Footer & WhatsApp Customizer
              </h2>
              <p className="text-[11px] text-[#B8B8B3]">
                Manage WhatsApp enquiry options, add or remove footer links and contact info
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 px-6 flex flex-wrap gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-4 font-semibold uppercase tracking-[0.06em] border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-[#5B1018] text-[#5B1018] bg-white'
                : 'border-transparent text-[#292321]/70 hover:text-black'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp Enquiry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-4 font-semibold uppercase tracking-[0.06em] border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-[#5B1018] text-[#5B1018] bg-white'
                : 'border-transparent text-[#292321]/70 hover:text-black'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Product Categories ({categoryLinks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`py-3 px-4 font-semibold uppercase tracking-[0.06em] border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'company'
                ? 'border-[#5B1018] text-[#5B1018] bg-white'
                : 'border-transparent text-[#292321]/70 hover:text-black'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Company Links ({companyLinks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-3 px-4 font-semibold uppercase tracking-[0.06em] border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'contact'
                ? 'border-[#5B1018] text-[#5B1018] bg-white'
                : 'border-transparent text-[#292321]/70 hover:text-black'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Contact & Enquiries ({contactItems.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: WHATSAPP ENQUIRY */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <div className="bg-[#FAF8F5] p-4 border border-[#D8BFA8]/60 space-y-1">
                <p className="text-xs font-semibold text-[#5B1018] uppercase tracking-wider">
                  Direct WhatsApp Enquiry Integration
                </p>
                <p className="text-xs text-[#292321]/80 leading-relaxed">
                  The WhatsApp number configured here powers the <strong>"WhatsApp Enquiry"</strong>{' '}
                  button in the footer, as well as quotation and enquiry buttons across product cards and
                  navigation.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#292321] mb-1">
                    WhatsApp Enquiry Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 919997890127 or +91 9997890127"
                      className="flex-1 px-3 py-2 border border-[#B8B8B3] text-sm font-mono focus:border-[#5B1018] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setWhatsappNumber('919997890127')}
                      className="px-3 py-2 bg-[#F5F5F5] border border-[#B8B8B3] hover:bg-black hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                      title="Use +91 9997890127 from company contact"
                    >
                      Use Company Phone (+91 9997890127)
                    </button>
                  </div>
                  <p className="text-[11px] text-[#292321]/60 mt-1">
                    Include country code (e.g. <strong>91</strong> for India). If entering 10 digits
                    (9997890127), country code 91 is added automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#292321] mb-1">
                    WhatsApp Button Label
                  </label>
                  <input
                    type="text"
                    value={whatsappButtonLabel}
                    onChange={(e) => setWhatsappButtonLabel(e.target.value)}
                    placeholder="e.g. WhatsApp Enquiry"
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-[#5B1018] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#292321] mb-1">
                    Default Enquiry Message
                  </label>
                  <textarea
                    rows={3}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Enter default WhatsApp message..."
                    className="w-full px-3 py-2 border border-[#B8B8B3] text-sm focus:border-[#5B1018] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#292321]/60 mt-1">
                    This text will automatically pre-fill in the customer's WhatsApp chat when clicking
                    the button.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#292321]">
                    <input
                      type="checkbox"
                      checked={showWhatsAppButton}
                      onChange={(e) => setShowWhatsAppButton(e.target.checked)}
                      className="accent-[#5B1018] w-4 h-4"
                    />
                    <span>Show WhatsApp Enquiry button in footer</span>
                  </label>
                </div>

                {/* Live Test Button */}
                <div className="pt-3 border-t border-[#B8B8B3]/50 flex items-center justify-between">
                  <div className="text-xs text-[#292321]/80">
                    <span className="font-semibold">Target URL:</span>{' '}
                    <span className="font-mono text-[11px] text-[#5B1018]">
                      https://wa.me/{formattedTestPhone}
                    </span>
                  </div>
                  <a
                    href={testWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Test on WhatsApp</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-black">
                    Category Links in Footer
                  </h3>
                  <p className="text-[11px] text-[#292321]/70">
                    Add or remove category navigation links displayed in column 2 of the footer.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#5B1018]">
                  {categoryLinks.length} links active
                </span>
              </div>

              {/* Current List */}
              <div className="border border-[#B8B8B3]/70 divide-y divide-[#B8B8B3]/50 bg-[#FAF8F5]">
                {categoryLinks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#292321]/60">
                    No category links in footer. Use the form below to add one.
                  </div>
                ) : (
                  categoryLinks.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-[#F5F5F5] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#F5F5F5] border border-[#B8B8B3] text-[10px] font-mono flex items-center justify-center text-[#292321]/70 shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-black">{item.label}</p>
                          <p className="text-[11px] font-mono text-[#292321]/60">{item.url}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategoryLink(item.id)}
                        className="p-1.5 text-[#5B1018] hover:bg-[#5B1018]/10 rounded transition-colors"
                        title={`Remove "${item.label}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Category Link Form */}
              <div className="bg-[#F5F5F5] p-4 border border-[#B8B8B3] space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5B1018] flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add New Category Link</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      Link Label
                    </label>
                    <input
                      type="text"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="e.g. Storage & Canisters"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      URL or Path
                    </label>
                    <input
                      type="text"
                      value={newCatUrl}
                      onChange={(e) => setNewCatUrl(e.target.value)}
                      placeholder="e.g. /products/kitchenware-home-utility"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!newCatLabel.trim()}
                    onClick={handleAddCategoryLink}
                    className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#5B1018] transition-colors disabled:opacity-40"
                  >
                    + Add Category Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPANY LINKS */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-black">
                    Company Links in Footer
                  </h3>
                  <p className="text-[11px] text-[#292321]/70">
                    Add or remove company information links displayed in column 3 of the footer.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#5B1018]">
                  {companyLinks.length} links active
                </span>
              </div>

              {/* Current List */}
              <div className="border border-[#B8B8B3]/70 divide-y divide-[#B8B8B3]/50 bg-[#FAF8F5]">
                {companyLinks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#292321]/60">
                    No company links in footer. Use the form below to add one.
                  </div>
                ) : (
                  companyLinks.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-[#F5F5F5] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#F5F5F5] border border-[#B8B8B3] text-[10px] font-mono flex items-center justify-center text-[#292321]/70 shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-black">{item.label}</p>
                          <p className="text-[11px] font-mono text-[#292321]/60">{item.url}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompanyLink(item.id)}
                        className="p-1.5 text-[#5B1018] hover:bg-[#5B1018]/10 rounded transition-colors"
                        title={`Remove "${item.label}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Company Link Form */}
              <div className="bg-[#F5F5F5] p-4 border border-[#B8B8B3] space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5B1018] flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add New Company Link</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      Link Label
                    </label>
                    <input
                      type="text"
                      value={newCompLabel}
                      onChange={(e) => setNewCompLabel(e.target.value)}
                      placeholder="e.g. Factory Tour & Capabilities"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      URL or Path
                    </label>
                    <input
                      type="text"
                      value={newCompUrl}
                      onChange={(e) => setNewCompUrl(e.target.value)}
                      placeholder="e.g. /about or /quote"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!newCompLabel.trim()}
                    onClick={handleAddCompanyLink}
                    className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#5B1018] transition-colors disabled:opacity-40"
                  >
                    + Add Company Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONTACT & ENQUIRIES */}
          {activeTab === 'contact' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-black">
                    Contact & Address Details
                  </h3>
                  <p className="text-[11px] text-[#292321]/70">
                    Add or remove address, phone, email, or custom business information lines in the
                    footer.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#5B1018]">
                  {contactItems.length} items active
                </span>
              </div>

              {/* Current List */}
              <div className="border border-[#B8B8B3]/70 divide-y divide-[#B8B8B3]/50 bg-[#FAF8F5]">
                {contactItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#292321]/60">
                    No contact items in footer. Use the form below to add one.
                  </div>
                ) : (
                  contactItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white flex items-start justify-between gap-3 hover:bg-[#F5F5F5] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-[#F5F5F5] border border-[#B8B8B3] text-[#5B1018] shrink-0 mt-0.5">
                          {item.type === 'email' ? (
                            <Mail className="w-3.5 h-3.5" />
                          ) : item.type === 'phone' ? (
                            <Phone className="w-3.5 h-3.5" />
                          ) : item.type === 'address' ? (
                            <MapPin className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-[#F5F5F5] text-[#292321]/70 border border-[#B8B8B3]/50">
                            {item.label}
                          </span>
                          <p className="text-xs text-black font-medium mt-1 leading-relaxed whitespace-pre-line">
                            {item.value}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContactItem(item.id)}
                        className="p-1.5 text-[#5B1018] hover:bg-[#5B1018]/10 rounded transition-colors shrink-0"
                        title={`Remove "${item.label}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Contact Item Form */}
              <div className="bg-[#F5F5F5] p-4 border border-[#B8B8B3] space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5B1018] flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add New Contact Detail</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      Type
                    </label>
                    <select
                      value={newContactType}
                      onChange={(e) =>
                        setNewContactType(
                          e.target.value as 'address' | 'email' | 'phone' | 'custom'
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#B8B8B3] focus:border-black focus:outline-none"
                    >
                      <option value="phone">Phone / Mobile</option>
                      <option value="email">Email Address</option>
                      <option value="address">Factory / Office Address</option>
                      <option value="custom">Other Detail / GST / Timings</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#292321] mb-1">
                      Label / Heading
                    </label>
                    <input
                      type="text"
                      value={newContactLabel}
                      onChange={(e) => setNewContactLabel(e.target.value)}
                      placeholder={
                        newContactType === 'phone'
                          ? 'e.g. Sales Enquiry Hotline'
                          : newContactType === 'email'
                          ? 'e.g. Quotation Desk'
                          : newContactType === 'address'
                          ? 'e.g. Registered Plant & Godown'
                          : 'e.g. GSTIN or Working Hours'
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#292321] mb-1">
                    Value / Content
                  </label>
                  <textarea
                    rows={2}
                    value={newContactValue}
                    onChange={(e) => setNewContactValue(e.target.value)}
                    placeholder="Enter phone number, address line, email, or note..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#B8B8B3] focus:border-black focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!newContactValue.trim()}
                    onClick={handleAddContactItem}
                    className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#5B1018] transition-colors disabled:opacity-40"
                  >
                    + Add Contact Detail
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#B8B8B3] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-[#292321]/70 hover:text-black font-medium underline underline-offset-4"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#B8B8B3] text-xs font-semibold uppercase tracking-wider hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="px-6 py-2 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#430b11] transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
