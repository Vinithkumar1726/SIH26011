import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, MapPin, Building2, Layers, Box, Search } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { Badge, Button, Empty } from '../design/primitives';
import { DOMAIN, FONT, INK, MUTED, PAPER, SURFACE, type DomainKey } from '../design/tokens';

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

  const shell = (children: React.ReactNode) => (
    <div className={`flex flex-col shrink-0 ${className}`} style={{ background: SURFACE.panel, borderLeft: `3px solid ${INK}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `3px solid ${INK}`, background: DOMAIN.record }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: INK }}>Registry</div>
        <h3 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: INK }}>HIERARCHY</h3>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex-1 flex flex-col gap-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 34, background: SURFACE.raised, border: `2px dashed ${INK}` }} />
        ))}
      </div>
    );
  }

  if (parcels.length === 0) {
    return shell(
      <div className="flex-1 flex items-center justify-center p-4">
        <Empty title="No parcels yet" sub="Import cadastral data to populate the registry tree." />
      </div>
    );
  }

  return (
    <div className={`flex flex-col shrink-0 ${className}`} style={{ background: SURFACE.panel, borderLeft: `3px solid ${INK}` }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: `3px solid ${INK}`, background: DOMAIN.record }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: INK }}>Registry</div>
            <h3 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: INK }}>CADASTRAL HIERARCHY</h3>
          </div>
          <Badge domain="info">{parcels.length} parcel(s)</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Search size={14} color={INK} />
          <input
            type="text"
            placeholder="Search parcels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: SURFACE.input, color: PAPER,
              border: `2px solid ${INK}`, fontFamily: FONT.mono, fontSize: 11,
              padding: '6px 8px', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 flex gap-1 overflow-x-auto" style={{ borderBottom: `2px solid ${INK}` }}>
        {[
          { id: 'all', label: 'ALL', domain: 'info' as DomainKey },
          { id: 'parcel', label: 'PARCELS', icon: MapPin, domain: 'spatial' as DomainKey },
          { id: 'building', label: 'BUILDINGS', icon: Building2, domain: 'info' as DomainKey },
          { id: 'floor', label: 'FLOORS', icon: Layers, domain: 'ok' as DomainKey },
          { id: 'unit', label: 'UNITS', icon: Box, domain: 'temporal' as DomainKey },
        ].map((f) => (
          <Button
            key={f.id}
            domain={f.domain}
            active={filter === f.id}
            onClick={() => setFilter(f.id as any)}
            style={{ fontSize: 8, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {f.icon && <f.icon size={10} />}
            {f.label}
          </Button>
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
              color: DOMAIN.spatial,
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
      <div className="px-4 py-3" style={{ borderTop: `2px solid ${INK}` }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
          <span className="flex items-center gap-1">
            <MapPin size={10} color={DOMAIN.spatial} />
            Parcel
          </span>
          <span className="flex items-center gap-1">
            <Building2 size={10} color={DOMAIN.info} />
            Building
          </span>
          <span className="flex items-center gap-1">
            <Layers size={10} color={DOMAIN.ok} />
            Floor
          </span>
          <span className="flex items-center gap-1">
            <Box size={10} color={DOMAIN.temporal} />
            Unit
          </span>
        </div>
        {user && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${INK}` }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
              <span className="font-mono">Logged in as:</span>
              <span className="font-medium" style={{ color: PAPER }}>{user.displayName}</span>
              <Badge domain={user.role === 'admin' ? 'temporal' : user.role === 'surveyor' ? 'info' : user.role === 'reviewer' ? 'ok' : 'warn'}>
                {user.role.toUpperCase()}
              </Badge>
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
  const [hover, setHover] = useState(false);

  return (
    <div className="select-none" style={level > 0 ? { borderLeft: `2px solid ${INK}`, marginLeft: 11, paddingLeft: 4 } : undefined}>
      <button
        onClick={(e) => {
          if (hasChildren) onToggle();
          onSelect(node.type, node.id, e);
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5"
        style={isSelected
          ? { background: DOMAIN.record, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, cursor: 'pointer' }
          : {
              border: '2px solid transparent', cursor: 'pointer',
              background: hover ? SURFACE.raised : 'transparent',
            }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {hasChildren && (
          <span className="flex items-center justify-center w-5" style={{ color: MUTED }}>
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {!hasChildren && <span className="w-5" />}
        <node.icon
          size={14}
          className="flex-shrink-0"
          style={{ color: isSelected ? INK : node.color }}
        />
        <span className="font-mono text-xs truncate flex-1" style={{ color: isSelected ? INK : PAPER }}>{node.code}</span>
        <span className="text-xs truncate flex-1" style={{ color: isSelected ? INK : MUTED, fontFamily: FONT.body }}>{node.label}</span>
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
