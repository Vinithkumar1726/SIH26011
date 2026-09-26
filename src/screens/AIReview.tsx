import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
import { Badge, Button, Card, Empty, Input, Panel } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE, type DomainKey } from '../design/tokens';

const PROPOSALS = [
  {
    id: '#001', src: 'building_no', dst: 'building_id', confidence: 94,
    reason: 'Field semantics and value pattern match building identifier schema.',
    type: 'FIELD MAPPING',
  },
  {
    id: '#002', src: 'storey', dst: 'Floor Number', confidence: 88,
    reason: 'Integer values in range 1–8 match floor numbering convention.',
    type: 'FIELD MAPPING',
  },
  {
    id: '#003', src: 'sqm', dst: 'Area (m²)', confidence: 97,
    reason: 'Numeric values with decimal precision match area measurement schema.',
    type: 'FIELD MAPPING',
  },
  {
    id: '#004', src: 'elev_bot', dst: 'Minimum Elevation', confidence: 82,
    reason: 'Values correspond to ground floor elevation offsets. Confirm Z reference.',
    type: 'FIELD MAPPING',
  },
  {
    id: '#005', src: 'Unit_U04', dst: 'anomaly:boundary_precision', confidence: 71,
    reason: 'Boundary segment 7 deviates 0.018m from adjacent unit. Minor precision issue.',
    type: 'ANOMALY',
  },
];

type Status = 'pending' | 'accepted' | 'rejected' | 'editing';

interface LiveProposal {
  id: string;
  status: string;
  source: string | null;
  ulpin: string | null;
  height_m: number | null;
  height_source: string | null;
  floors_override: number | null;
  z_base_msl_m: number | null;
  created_at: string | null;
}

/** Proposal source → palette domain (distinguishable at a glance, not just by text). */
function sourceDomain(source: string | null): DomainKey {
  if (source === 'osm' || (source ?? '').startsWith('live-map')) return 'spatial';
  if (source === 'vision' || (source ?? '').includes('vision')) return 'ai';
  if (source === 'synthetic_fallback') return 'warn';
  return 'info';
}

export default function AIReview() {
  const [live, setLive] = useState<LiveProposal[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [encroachNote, setEncroachNote] = useState<string | null>(null);

  const refreshLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    const res = await api.getAICandidates();
    if (res.success && res.data) setLive(res.data.proposals ?? []);
    else setLiveError(res.error || 'Failed to load live captures');
    setLiveLoading(false);
  }, []);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftHeight, setDraftHeight] = useState('');
  const [draftFloors, setDraftFloors] = useState('');
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const saveEdit = async (id: string) => {
    const patch: { height_m?: number; floors_override?: number; height_source?: string } = {};
    if (draftHeight.trim() !== '') patch.height_m = Number(draftHeight);
    if (draftFloors.trim() !== '') patch.floors_override = Number(draftFloors);
    if (patch.height_m !== undefined) patch.height_source = 'USER';
    if (Object.keys(patch).length === 0) { setEditMsg('Nothing to save.'); return; }
    const editRes = await api.editAIProposal(id, patch);
    if (editRes.success) {
      setEditMsg(null);
      setEditingId(null);
      await refreshLive();
    } else setEditMsg(editRes.error || 'Edit failed');
  };

  const decide = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const res = await api.reviewAIProposal(id, decision);
    if (res.success) {
      const encroached = decision === 'APPROVED' && (res.data as any)?.encroachment === true;
      if (encroached) {
        console.warn(`Encroachment: approved parcel ${(res.data as any)?.ulpin ?? id} intersects an existing parcel solid`);
        setEncroachNote(`Approved with ENCROACHMENT warning — ${(res.data as any)?.ulpin ?? id} physically intersects an existing parcel.`);
      } else {
        setEncroachNote(null);
      }
      await refreshLive();
    } else setLiveError(res.error || 'Review failed');
  };
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(PROPOSALS.map((p) => [p.id, 'pending']))
  );

  const accepted = Object.values(statuses).filter((s) => s === 'accepted').length;
  const rejected = Object.values(statuses).filter((s) => s === 'rejected').length;
  const pending = Object.values(statuses).filter((s) => s === 'pending').length;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="flex items-center gap-3 mb-1">
          <Badge domain="ai">AI</Badge>
          <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
            AI-ASSISTED MAPPING REVIEW
          </h1>
        </div>
        <p style={{ fontSize: 11, color: MUTED }}>
          Review AI field-mapping proposals and anomaly detections. Approve or reject each item.
        </p>

        {/* Summary chips */}
        <div className="flex gap-2 mt-3">
          <Badge domain="warn"><span style={{ fontSize: 14, fontWeight: 700 }}>{pending}</span>&nbsp;PENDING</Badge>
          <Badge domain="ok"><span style={{ fontSize: 14, fontWeight: 700 }}>{accepted}</span>&nbsp;ACCEPTED</Badge>
          <Badge domain="conflict"><span style={{ fontSize: 14, fontWeight: 700 }}>{rejected}</span>&nbsp;REJECTED</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-4" style={{ maxWidth: 760 }}>
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: PAPER, letterSpacing: '0.06em' }}>
              LIVE-CAPTURED BUILDINGS (FROM 3D GROUND CLICKS)
            </div>
            {!liveLoading && !liveError && live.length > 0 && (
              <Badge domain="ai">{live.length} PENDING</Badge>
            )}
          </div>
          {liveLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 120, background: SURFACE.raised, border: `2px dashed ${INK}` }} />
              ))}
            </div>
          )}
          {liveError && (
            <Card><span style={{ color: DOMAIN.conflict, fontFamily: FONT.mono, fontSize: 11 }}>{liveError}</span></Card>
          )}
          {encroachNote && (
            <Card><span style={{ color: DOMAIN.conflict, fontFamily: FONT.mono, fontSize: 11, fontWeight: 700 }}>{encroachNote}</span></Card>
          )}
          {!liveLoading && !liveError && live.length === 0 && (
            <Empty title="No pending captures" sub="Click ground in the 3D Explorer with Live Capture Mode on." />
          )}
          {live.map((p) => (
            <Panel
              key={p.id}
              accent="ai"
              right={<Badge domain="info">LIVE CAPTURE {p.id.slice(0, 8)}…</Badge>}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge domain={sourceDomain(p.source)}>
                  {(p.source ?? 'unknown').toUpperCase()}
                </Badge>
              </div>
              <p style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 12, color: PAPER, margin: '0 0 4px 0', lineHeight: 1.5 }}>
                Bhu-Aadhaar {p.ulpin ?? '—'} · captured{' '}
                {p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '—'}
              </p>
              {p.source === 'synthetic_fallback' && (
                <div style={{ margin: '4px 0', fontSize: 11, color: DOMAIN.warn, fontFamily: FONT.mono }}>
                  Synthetic 10 m box — NOT a detected building.
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap" style={{ margin: '8px 0' }}>
                <Badge domain="info">H {p.height_m ?? '—'} m</Badge>
                <Badge
                  domain={(p.height_source ?? 'ESTIMATED') === 'USER' ? 'ok' : 'warn'}
                >
                  {(p.height_source ?? 'ESTIMATED') === 'USER' ? 'USER-SET' : 'ESTIMATED — NOT SURVEY-GRADE'}
                </Badge>
                {p.floors_override != null && (
                  <Badge domain="info">{p.floors_override} FLOORS (USER)</Badge>
                )}
                {p.z_base_msl_m != null && (
                  <Badge domain="spatial">BASE {Number(p.z_base_msl_m).toFixed(1)} m MSL</Badge>
                )}
                <Button
                  domain="info"
                  style={{ fontSize: 9, padding: '4px 10px' }}
                  onClick={() => {
                    setEditingId(editingId === p.id ? null : p.id);
                    setDraftHeight(p.height_m != null ? String(p.height_m) : '');
                    setDraftFloors(p.floors_override != null ? String(p.floors_override) : '');
                    setEditMsg(null);
                  }}
                >
                  {editingId === p.id ? 'CANCEL EDIT' : 'EDIT H/FLOORS'}
                </Button>
              </div>
              {editingId === p.id && (
                <div className="flex items-center gap-2 flex-wrap" style={{ margin: '4px 0 8px 0' }}>
                  <Input
                    value={draftHeight}
                    onChange={(e) => setDraftHeight(e.target.value)}
                    placeholder="Height m"
                    type="number"
                    min="0"
                    step="0.5"
                    style={{ width: 110, fontSize: 10 }}
                  />
                  <Input
                    value={draftFloors}
                    onChange={(e) => setDraftFloors(e.target.value)}
                    placeholder="Floors"
                    type="number"
                    min="1"
                    step="1"
                    style={{ width: 90, fontSize: 10 }}
                  />
                  <Button domain="record" style={{ fontSize: 9, padding: '6px 12px' }} onClick={() => void saveEdit(p.id)}>
                    SAVE
                  </Button>
                  {editMsg && <span style={{ fontSize: 10, color: DOMAIN.conflict }}>{editMsg}</span>}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `2px solid ${INK}` }}>
                <Button
                  domain="conflict"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => void decide(p.id, 'REJECTED')}
                >
                  REJECT
                </Button>
                <Button
                  domain="ok"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => void decide(p.id, 'APPROVED')}
                >
                  APPROVE → ADD 3D BUILDING
                </Button>
              </div>
            </Panel>
          ))}
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: MUTED, marginTop: 8 }}>
            FIELD-MAPPING PROPOSALS (STATIC DEMO)
          </div>
          {PROPOSALS.map((p) => {
            const st = statuses[p.id];
            return (
              <Panel
                key={p.id}
                accent={st === 'accepted' ? 'ok' : st === 'rejected' ? 'conflict' : 'record'}
                right={
                  st !== 'pending'
                    ? <Badge domain={st === 'accepted' ? 'ok' : 'conflict'}>● {st.toUpperCase()}</Badge>
                    : undefined
                }
              >
                <div className="flex items-start justify-between" style={{ opacity: st === 'rejected' ? 0.55 : 1 }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge domain="info">AI PROPOSAL {p.id}</Badge>
                      <Badge domain={p.type === 'ANOMALY' ? 'warn' : 'info'}>{p.type}</Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        style={{
                          fontFamily: FONT.mono, fontWeight: 700, fontSize: 12,
                          color: PAPER, background: SURFACE.raised,
                          padding: '4px 10px', border: `2px solid ${INK}`,
                        }}
                      >
                        {p.src}
                      </span>
                      <ArrowRight size={12} color={PAPER} strokeWidth={3} />
                      <span
                        style={{
                          fontFamily: FONT.mono, fontWeight: 700, fontSize: 12,
                          color: INK, background: DOMAIN.ai,
                          padding: '4px 10px', border: `2px solid ${INK}`,
                        }}
                      >
                        {p.dst}
                      </span>
                    </div>

                    <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                      {p.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-6 shrink-0">
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 22, color: PAPER }}>
                      {p.confidence}%
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: MUTED }}>
                      CONFIDENCE
                    </div>
                    <div style={{ width: 60, height: 10, marginTop: 2, border: `2px solid ${INK}`, background: SURFACE.input }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${p.confidence}%`,
                          background: p.confidence > 90 ? DOMAIN.ok : DOMAIN.record,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {st === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: `2px solid ${INK}` }}>
                    <Button
                      domain="conflict"
                      style={{ fontSize: 10, padding: '6px 14px' }}
                      onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: 'rejected' }))}
                    >
                      REJECT
                    </Button>
                    <Button domain="info" style={{ fontSize: 10, padding: '6px 14px' }}>
                      EDIT
                    </Button>
                    <Button
                      domain="ok"
                      style={{ fontSize: 10, padding: '6px 14px' }}
                      onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: 'accepted' }))}
                    >
                      ACCEPT
                    </Button>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
