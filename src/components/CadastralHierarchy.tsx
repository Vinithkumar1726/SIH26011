import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, MapPin, Building2, Layers, Box, Copy, Search } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';

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
      <div className={`bg-surface border-l border-border flex flex-col ${className}`}>
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-text-primary">HIERARCHY</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className={`bg-surface border-l border-border flex flex-col ${className}`}>
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-text-primary">HIERARCHY</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-text-tertiary text-sm text-center">No parcels found. Import data to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border-l border-border flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-sm text-text-primary">CADASTRAL HIERARCHY</h3>
          <span className="font-mono text-xs text-text-tertiary">{parcels.length} parcel(s)</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 bg-muted border border-border rounded text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-primary"
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
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-primary text-white'
                : 'text-text-tertiary hover:bg-muted hover:text-text-primary'
            }`}
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
    <div className="select-none">
      <button
        onClick={(e) => {
          if (hasChildren) onToggle();
          onSelect(node.type, node.id, e);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
          isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
        }`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
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