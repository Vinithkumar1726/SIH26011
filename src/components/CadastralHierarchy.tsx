import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, MapPin, Building2, Layers, Box, Copy, Search } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { BrutalEmpty } from './brutal';

export default function CadastralHierarchy({ className = 'hidden md:flex w-72' }: { className?: string }) {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<{ type: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'parcel' | 'building' | 'floor' | 'unit'>('all');

  useEffect(() => {
    let active = true;
    api.getParcels().then((result) => {
      if (active) {
        if (result.success && result.data) setParcels(result.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isExpanded = (id: string) => expanded[id] === true;

  const handleSelect = (type: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode({ type, id });
  };

  const filteredParcels = parcels.filter((parcel) => {
    if (parcel.id === 'parcel-osm-coimbatore') return false;
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      parcel.id.toLowerCase().includes(query) ||
      parcel.ulpin.toLowerCase().includes(query) ||
      parcel.name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className={`bg-white flex flex-col shrink-0 ${className}`} style={{ borderLeft: '3px solid #111111' }}>
        <div className="px-4 py-3" style={{ borderBottom: '3px solid #111111', background: '#111111' }}>
          <div className="brutal-eyebrow" style={{ color: '#F5C400' }}>Registry</div>
          <h3 className="font-display font-bold text-sm text-white">HIERARCHY</h3>
        </div>
        <div className="flex-1 flex flex-col gap-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="brutal-skeleton" style={{ height: 34 }} />
          ))}
        </div>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className={`bg-white flex flex-col shrink-0 ${className}`} style={{ borderLeft: '3px solid #111111' }}>
        <div className="px-4 py-3" style={{ borderBottom: '3px solid #111111', background: '#111111' }}>
          <div className="brutal-eyebrow" style={{ color: '#F5C400' }}>Registry</div>
          <h3 className="font-display font-bold text-sm text-white">HIERARCHY</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <BrutalEmpty title="No parcels yet" sub="Import cadastral data to populate the registry tree." />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white flex flex-col shrink-0 ${className}`} style={{ borderLeft: '3px solid #111111' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '3px solid #111111', background: '#111111' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="brutal-eyebrow" style={{ color: '#F5C400' }}>Registry</div>
            <h3 className="font-display font-bold text-sm text-white">CADASTRAL HIERARCHY</h3>
          </div>
          <span className="brutal-badge brutal-badge-gold">{parcels.length} parcel(s)</span>
        </div>
        <div className="input-icon">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search parcels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="brutal-input"
            style={{ background: '#fff' }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-border flex gap-1 overflow-x-auto">
        {[
          { id: 'all', label: 'ALL' },
          { id: 'parcel', label: 'PARCELS', icon: MapPin },
          { id: 'building', label: 'BUILDINGS', icon: Building2 },
          { id: 'floor', label: 'FLOORS', icon: Layers },
          { id: 'unit', label: 'UNITS', icon: Box },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`chip transition-all ${filter === f.id ? 'chip-gold' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            {f.icon && <f.icon size={10} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredParcels.map((parcel) => (
          <HierarchyNode
            key={parcel.id}
            node={{
              id: parcel.id,
              type: 'parcel',
              label: parcel.name,
              code: parcel.ulpin,
              icon: MapPin,
              color: '#F59E0B',
              children: [],
            }}
            isExpanded={isExpanded(parcel.id)}
            onToggle={() => toggleExpand(parcel.id)}
            onSelect={handleSelect}
            selectedNode={selectedNode}
            level={0}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <MapPin size={10} className="text-amber-500" />
            Parcel
          </span>
          <span className="flex items-center gap-1">
            <Building2 size={10} className="text-blue-500" />
            Building
          </span>
          <span className="flex items-center gap-1">
            <Layers size={10} className="text-green-500" />
            Floor
          </span>
          <span className="flex items-center gap-1">
            <Box size={10} className="text-purple-500" />
            Unit
          </span>
        </div>
        {user && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span className="font-mono">Logged in as:</span>
              <span className="font-medium text-text-primary">{user.displayName}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                user.role === 'surveyor' ? 'bg-blue-100 text-blue-700' :
                user.role === 'reviewer' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface HierarchyNodeProps {
  node: {
    id: string;
    type: 'parcel' | 'building' | 'floor' | 'unit';
    label: string;
    code: string;
    icon: any;
    color: string;
    children: any[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (type: string, id: string, e: React.MouseEvent) => void;
  selectedNode: { type: string; id: string } | null;
  level: number;
}

function HierarchyNode({ node, isExpanded, onToggle, onSelect, selectedNode, level }: HierarchyNodeProps) {
  const isSelected = selectedNode?.type === node.type && selectedNode?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none" style={level > 0 ? { borderLeft: '2px solid #111111', marginLeft: 11, paddingLeft: 4 } : undefined}>
      <button
        onClick={(e) => {
          if (hasChildren) onToggle();
          onSelect(node.type, node.id, e);
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 transition-all duration-100"
        style={isSelected
          ? { background: '#F5C400', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111' }
          : { border: '2px solid transparent' }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F4F1E8'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {hasChildren && (
          <span className="flex items-center justify-center w-5 text-text-tertiary">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {!hasChildren && <span className="w-5" />}
        <node.icon
          size={14}
          className={`flex-shrink-0 ${isSelected ? 'text-primary' : ''}`}
          style={{ color: node.color }}
        />
        <span className="font-mono text-xs text-text-primary truncate flex-1">{node.code}</span>
        <span className="text-xs text-text-tertiary truncate flex-1">{node.label}</span>
      </button>
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child: any) => (
            <HierarchyNode
              key={child.id}
              node={child}
              isExpanded={false}
              onToggle={() => {}}
              onSelect={onSelect}
              selectedNode={selectedNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}