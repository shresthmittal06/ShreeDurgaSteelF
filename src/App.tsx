import { useEffect, useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { AdminEditBar } from './components/AdminEditBar';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { GnPansPage } from './pages/GnPansPage';
import { KitchenwarePage } from './pages/KitchenwarePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AboutPage } from './pages/AboutPage';
import { QuotePage } from './pages/QuotePage';
import { AdminPage } from './pages/AdminPage';
import type { ProductCategoryId } from './types/catalog';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function RouterContent() {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (targetPath: string) => {
    const normalized = normalizePath(targetPath);
    if (normalized !== currentPath) {
      window.history.pushState({}, '', normalized);
      setCurrentPath(normalized);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const renderPage = () => {
    if (currentPath === '/') {
      return <HomePage onNavigate={navigate} />;
    }
    if (currentPath === '/products') {
      return <CategoryPage onNavigate={navigate} />;
    }
    if (currentPath === '/products/kitchenware-home-utility') {
      return <KitchenwarePage onNavigate={navigate} />;
    }
    if (currentPath === '/products/gn-pans') {
      return <GnPansPage onNavigate={navigate} />;
    }
    if (currentPath === '/products/commercial-kitchen-equipment') {
      const catId = currentPath.replace('/products/', '') as ProductCategoryId;
      return <CategoryPage categoryId={catId} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/product/')) {
      const prodId = currentPath.replace('/product/', '');
      return <ProductDetailPage productId={prodId} onNavigate={navigate} />;
    }
    if (currentPath === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }
    if (currentPath === '/quote') {
      return <QuotePage onNavigate={navigate} />;
    }
    if (currentPath === '/admin') {
      return <AdminPage />;
    }
    return <HomePage onNavigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#292321]">
      <AdminEditBar currentPath={currentPath} onNavigate={navigate} />
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main className="flex-1">{renderPage()}</main>
      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <RouterContent />
    </StoreProvider>
  );
}
