import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Screen } from './types';
import { api, type DashboardStats } from './api';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import SearchModal from './components/SearchModal';
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
import CadastralHierarchy from './components/CadastralHierarchy';

// Auth context for JWT-ready authentication
interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'surveyor' | 'reviewer' | 'viewer';
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (username: string, password: string) => {
    // TODO: Replace with real JWT authentication against /api/auth/login
    // For now, mock login with role detection from username
    const roles: Record<string, AuthUser['role']> = {
      'admin': 'admin',
      'rajesh.k': 'surveyor',
      'priya.s': 'reviewer',
      'amit.p': 'viewer',
    };
    const role = roles[username] || 'viewer';
    const displayNames: Record<string, string> = {
      'admin': 'System Administrator',
      'rajesh.k': 'Rajesh Kumar',
      'priya.s': 'Priya Sharma',
      'amit.p': 'Amit Patel',
    };
    setUser({ id: 'u1', username, role, displayName: displayNames[username] || username });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Data loading hooks
function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getDashboardStats().then((result) => {
      if (active) {
        if (result.success && result.data) setStats(result.data);
        else setError(result.error || 'Failed to load stats');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { stats, loading, error };
}

function useParcels() {
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getParcels().then((result) => {
      if (active) {
        if (result.success && result.data) setParcels(result.data);
        else setError(result.error || 'Failed to load parcels');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { parcels, loading, error, refetch: () => setLoading(true) };
}

function useParcel(id: string) {
  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.getParcel(id).then((result) => {
      if (active) {
        if (result.success && result.data) setParcel(result.data);
        else setError(result.error || 'Failed to load parcel');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [id]);

  return { parcel, loading, error };
}

function useUnits() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getUnits().then((result) => {
      if (active) {
        if (result.success && result.data) setUnits(result.data);
        else setError(result.error || 'Failed to load units');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { units, loading, error };
}

function useUnit(id: string) {
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.getUnit(id).then((result) => {
      if (active) {
        if (result.success && result.data) setUnit(result.data);
        else setError(result.error || 'Failed to load unit');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [id]);

  return { unit, loading, error };
}

function useSpatialIdentifiers() {
  const [identifiers, setIdentifiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getSpatialIdentifiers().then((result) => {
      if (active) {
        if (result.success && result.data) setIdentifiers(result.data);
        else setError(result.error || 'Failed to load identifiers');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { identifiers, loading, error };
}

function useValidation() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    const res = await api.runValidation();
    if (res.success && res.data) setResult(res.data);
    else setError(res.error || 'Validation failed');
    setLoading(false);
  };

  return { result, loading, error, run };
}

function useAICandidates() {
  const [candidates, setCandidates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAICandidates().then((result) => {
      if (active) {
        if (result.success && result.data) setCandidates(result.data);
        else setError(result.error || 'Failed to load AI candidates');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { candidates, loading, error };
}

function useAuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAuditTrail().then((result) => {
      if (active) {
        if (result.success && result.data) setLogs(result.data);
        else setError(result.error || 'Failed to load audit trail');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { logs, loading, error };
}

// Main app component with data providers
function AppInner() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let active = true;
    api.health().then((result) => {
      if (active) setApiOnline(result.success);
    });
    return () => { active = false; };
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
        return <PropertyRecords onSelectUnit={(id) => { setSelectedUnitId(id); setScreen('property-detail'); }} />;
      case 'property-detail':
        return selectedUnitId ? <PropertyDetail unitId={selectedUnitId} onBack={() => { setScreen('records'); setSelectedUnitId(null); }} /> : <PropertyRecords onSelectUnit={(id) => { setSelectedUnitId(id); setScreen('property-detail'); }} />;
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
    <div
      className="app-shell h-screen w-screen flex overflow-hidden relative"
      style={{
        flexDirection: 'column',
        background: '#020617',
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
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 76 }}>
        <Sidebar active={screen} onNav={setScreen} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          <main className="flex-1 min-h-0 flex flex-col" style={{ minWidth: 0, overflow: 'auto' }}>
            {renderScreen()}
          </main>
        </div>

        {/* Right sidebar - Cadastral Hierarchy */}
        <CadastralHierarchy />
      </div>

      <StatusBar />

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onNav={(s) => { setScreen(s); setSearchOpen(false); }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
