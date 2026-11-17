import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, MessageCircle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CompanyLogo } from './CompanyLogo';
import { EditableText } from './EditableText';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Navbar({ currentPath, onNavigate }: NavbarProps) {
  const { quoteItems, categoriesWithOverrides, getWhatsAppUrl } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [currentPath]);

  const isProductsActive =
    currentPath.startsWith('/products') || currentPath.startsWith('/product/');
  const isAboutActive = currentPath === '/about';
  const isQuoteActive = currentPath === '/quote';

  const handleLinkClick = (path: string) => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#B8B8B3]/60">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between gap-8">
        {/* LEFT SIDE: 1. Company Logo  2. Company Name */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('/');
          }}
          className="flex items-center gap-3 shrink-0 group focus-visible:outline-none"
        >
          <CompanyLogo variant="light" className="w-8 h-8 shrink-0" />
          <EditableText
            id="brand.name"
            defaultText="SHREE DURGA STEELS"
            label="Company Brand Name"
            allowDelete={false}
            className="font-display text-base sm:text-lg font-semibold tracking-[0.06em] text-black whitespace-nowrap shrink-0"
          />
        </a>

        {/* RIGHT SIDE (Desktop): 1. PRODUCTS (dropdown)  2. ABOUT US  3. GET A QUOTE */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 shrink-0"
        >
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className={`inline-flex items-center gap-1.5 py-2 text-xs font-semibold tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 ${
                isProductsActive || dropdownOpen
                  ? 'text-black border-[#5B1018]'
                  : 'text-[#292321] border-transparent hover:text-black hover:border-[#B8B8B3]'
              }`}
            >
              <EditableText
                id="nav.products"
                defaultText="PRODUCTS"
                label="Navigation Label: PRODUCTS"
                allowDelete={false}
              />
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-80 bg-white border border-[#B8B8B3] shadow-sm py-2 z-50"
              >
                <div className="px-4 py-2 border-b border-[#F5F5F5]">
                  <EditableText
                    id="nav.dropdownHeading"
                    defaultText="Product Categories"
                    label="Products Dropdown Heading"
                    as="p"
                    className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#292321]/60"
                  />
                </div>
                {categoriesWithOverrides.map((category, idx) => {
                  const catPath = `/products/${category.id}`;
                  const active = currentPath === catPath;
                  const letter = idx === 0 ? 'A' : idx === 1 ? 'B' : 'C';
                  return (
                    <a
                      key={category.id}
                      href={catPath}
                      role="menuitem"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(catPath);
                      }}
                      className={`block px-4 py-3 text-sm transition-colors border-b border-[#F5F5F5] last:border-b-0 ${
                        active
                          ? 'bg-[#F5F5F5] text-black font-semibold'
                          : 'text-[#292321] hover:bg-[#F5F5F5] hover:text-black'
                      }`}
                    >
                      <span className="font-mono text-xs text-[#5B1018] mr-2">
                        {letter}.
                      </span>
                      <span>{category.navLabel}</span>
                    </a>
                  );
                })}
                <div className="border-t border-[#B8B8B3]/50 mt-1 pt-1">
                  <a
                    href="/products"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick('/products');
                    }}
                    className="block px-4 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase text-[#5B1018] hover:bg-[#F5F5F5] transition-colors"
                  >
                    <EditableText
                      id="nav.browseAll"
                      defaultText="Browse All Products"
                      label="Browse All Products Link"
                    />
                  </a>
                </div>
              </div>
            )}
          </div>

          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('/about');
            }}
            className={`py-2 text-xs font-semibold tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 ${
              isAboutActive
                ? 'text-black border-[#5B1018]'
                : 'text-[#292321] border-transparent hover:text-black hover:border-[#B8B8B3]'
            }`}
          >
            <EditableText
              id="nav.about"
              defaultText="ABOUT US"
              label="Navigation Label: ABOUT US"
              allowDelete={false}
            />
          </a>

          <a
            href={getWhatsAppUrl(
              'Hello SHREE DURGA STEELS, I would like to request a quotation for your stainless steel products.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 bg-[#5B1018] text-white border border-[#5B1018] hover:bg-[#430b11] inline-flex items-center gap-2"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <EditableText
              id="nav.quote"
              defaultText="QUOTE ON WHATSAPP"
              label="Navigation Button: QUOTE ON WHATSAPP"
              allowDelete={false}
            />
          </a>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 border border-[#B8B8B3] text-black hover:bg-[#F5F5F5] transition-colors shrink-0"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#B8B8B3]/60 px-4 py-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#292321]/60 pb-1">
              Products
            </p>
            {categoriesWithOverrides.map((category, idx) => {
              const catPath = `/products/${category.id}`;
              const letter = idx === 0 ? 'A' : idx === 1 ? 'B' : 'C';
              return (
                <a
                  key={category.id}
                  href={catPath}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(catPath);
                  }}
                  className="block py-2.5 px-2 text-sm text-[#292321] hover:bg-[#F5F5F5] border-b border-[#F5F5F5]"
                >
                  <span className="font-mono text-xs text-[#5B1018] mr-2">{letter}.</span>
                  {category.navLabel}
                </a>
              );
            })}
            <a
              href="/products"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('/products');
              }}
              className="block py-2.5 px-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#5B1018]"
            >
              Browse All Products
            </a>
          </div>

          <div className="pt-2 border-t border-[#B8B8B3]/50 space-y-3">
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('/about');
              }}
              className="block py-2.5 text-xs font-semibold tracking-[0.08em] uppercase text-[#292321]"
            >
              ABOUT US
            </a>
            <a
              href={getWhatsAppUrl(
                'Hello SHREE DURGA STEELS, I would like to request a quotation for your stainless steel products.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-3 px-4 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>QUOTE ON WHATSAPP</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
