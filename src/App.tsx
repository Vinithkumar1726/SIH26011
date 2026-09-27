import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, AuthGuard, LoginScreen } from './auth';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApiHealth } from './hooks';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import SearchModal from './components/SearchModal';
import CadastralHierarchy from './components/CadastralHierarchy';
import Dashboard from './screens/Dashboard';
import ImportWorkflow from './screens/ImportWorkflow';
import Explorer3D from './screens/Explorer3D';
import PropertyRecords from './screens/PropertyRecords';
import PropertyDetail from './screens/PropertyDetail';
import Validation from './screens/Validation';
import SpatialIdentifiers from './screens/SpatialIdentifiers';
import AIReview from './screens/AIReview';
import AuditTrail from './screens/AuditTrail';
import Settings from './screens/Settings';
import { SURFACE, DOMAIN, BORDER, SHADOW, FONT } from './design/tokens';
import type { Screen } from './types';

// Protected route wrapper
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode; 
  allowedRoles?: ('admin' | 'surveyor' | 'reviewer' | 'viewer')[]; 
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        minHeight: '100vh',
        background: SURFACE.app,
        color: '#F4F1E8',
        fontFamily: FONT.body,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${DOMAIN.spatial}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontFamily: FONT.mono, fontSize: 12, color: '#9AA3B2' }}>
            Verifying session...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Public route (login page)
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: SURFACE.app,
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: `3px solid ${DOMAIN.spatial}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App shell with layout AND routes
function AppShell() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const { online: apiOnline } = useApiHealth();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(p => !p);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard onNav={setScreen} />;
      case 'import':
        return <ImportWorkflow onExplore={() => setScreen('explorer')} />;
      case 'explorer':
        return <Explorer3D />;
      case 'records':
        return <PropertyRecords />;
      case 'property-detail':
        return <PropertyDetail />;
      case 'validation':
        return <Validation />;
      case 'identifiers':
        return <SpatialIdentifiers />;
      case 'ai-review':
        return <AIReview />;
      case 'audit':
        return <AuditTrail />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNav={setScreen} />;
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: SURFACE.app,
          padding: 24,
          color: '#F4F1E8',
          fontFamily: FONT.body,
          textAlign: 'center',
        }}>
          <h1 style={{ fontFamily: FONT.display, fontSize: 32, marginBottom: 16, color: DOMAIN.conflict }}>
            Application Error
          </h1>
          <p style={{ maxWidth: 500, lineHeight: 1.6, color: '#9AA3B2' }}>
            Something went wrong. The error has been logged. Please refresh the page or contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: DOMAIN.spatial,
              color: '#000',
              border: BORDER,
              boxShadow: SHADOW,
              fontFamily: FONT.body,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      }
    >
      <div
        className="app-shell h-screen w-screen flex overflow-hidden relative"
        style={{
          flexDirection: 'column',
          background: SURFACE.app,
        }}
      >
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Topbar screen={screen} onNav={setScreen} apiOnline={apiOnline} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              paddingTop: 76,
            }}
          >
            <Sidebar active={screen} onNav={setScreen} />

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <main className="flex-1 min-h-0 flex flex-col" style={{ minWidth: 0, overflow: 'auto' }}>
                {renderScreen()}
              </main>
            </div>

            {/* Right sidebar - Cadastral Hierarchy */}
            <CadastralHierarchy />
          </motion.div>
        </AnimatePresence>

        <StatusBar />

        {searchOpen && (
          <SearchModal onClose={() => setSearchOpen(false)} onNav={(s) => { setScreen(s); setSearchOpen(false); }} />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Main routes with auth protection
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginScreen />
        </PublicRoute>
      } />

      {/* Protected routes - AppShell handles all internal routing via renderScreen */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      } />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: SURFACE.app,
          color: '#F4F1E8',
          fontFamily: FONT.body,
          textAlign: 'center',
          padding: 24,
        }}>
          <h1 style={{ fontFamily: FONT.display, fontSize: 32, marginBottom: 16, color: DOMAIN.warn }}>
            Unauthorized
          </h1>
          <p style={{ maxWidth: 500, lineHeight: 1.6, color: '#9AA3B2', marginBottom: 24 }}>
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: DOMAIN.spatial,
              color: '#000',
              border: BORDER,
              boxShadow: SHADOW,
              fontFamily: FONT.body,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}