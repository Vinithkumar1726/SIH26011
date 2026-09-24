import { useCallback, useEffect, useState } from 'react';
import { Sparkles, CheckCircle, X, Edit2, ArrowRight } from 'lucide-react';
import { api } from '../api';

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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="brutal-badge brutal-badge-gold">AI</span>
          <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
            AI-ASSISTED MAPPING REVIEW
          </h1>
        </div>
        <p style={{ fontSize: 11, color: '#555555' }}>
          Review AI field-mapping proposals and anomaly detections. Approve or reject each item.
        </p>

        {/* Summary chips */}
        <div className="flex gap-2 mt-3">
          {[
            { label: 'PENDING', val: pending, tone: 'gold' as const },
            { label: 'ACCEPTED', val: accepted, tone: 'green' as const },
            { label: 'REJECTED', val: rejected, tone: 'red' as const },
          ].map((m) => (
            <div key={m.label} className={`brutal-badge brutal-badge-${m.tone}`} style={{ fontSize: 10, padding: '4px 12px' }}>
              <span className="font-display font-bold" style={{ fontSize: 14 }}>{m.val}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-4" style={{ maxWidth: 760 }}>
          <div className="flex items-center justify-between">
            <div className="brutal-title">
              LIVE-CAPTURED BUILDINGS (FROM 3D GROUND CLICKS)
            </div>
            {!liveLoading && !liveError && live.length > 0 && (
              <span className="brutal-badge brutal-badge-gold">{live.length} PENDING</span>
            )}
          </div>
          {liveLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="brutal-skeleton" style={{ height: 120 }} />
              ))}
            </div>
          )}
          {liveError && (
            <div className="brutal-notice brutal-notice-red">{liveError}</div>
          )}
          {encroachNote && (
            <div className="brutal-notice brutal-notice-red" style={{ fontWeight: 700 }}>{encroachNote}</div>
          )}
          {!liveLoading && !liveError && live.length === 0 && (
            <div className="brutal-panel-flat" style={{ padding: 20, textAlign: 'center', borderStyle: 'dashed' }}>
              <div className="brutal-title" style={{ marginBottom: 4 }}>No pending captures</div>
              <div style={{ fontSize: 11, color: '#555' }}>
                Click ground in the 3D Explorer with Live Capture Mode on.
              </div>
            </div>
          )}
          {live.map((p, li) => (
            <div
              key={p.id}
              className="brutal-panel"
              style={{ padding: 16, borderLeft: '8px solid #F5C400' }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="brutal-badge brutal-badge-black">
                  LIVE CAPTURE {p.id.slice(0, 8)}…
                </span>
                <span
                  className={`brutal-badge ${p.source === 'synthetic_fallback' ? 'brutal-badge-gold' : ''}`}
                >
                  {(p.source ?? 'unknown').toUpperCase()}
                </span>
              </div>
              <p className="font-mono font-bold" style={{ fontSize: 12, color: '#111', margin: '0 0 4px 0', lineHeight: 1.5 }}>
                Bhu-Aadhaar {p.ulpin ?? '—'} · captured{' '}
                {p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '—'}
              </p>
              {p.source === 'synthetic_fallback' && (
                <div className="brutal-notice brutal-notice-gold" style={{ margin: '4px 0', fontSize: 11 }}>
                  Synthetic 10 m box — NOT a detected building.
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap" style={{ margin: '8px 0' }}>
                <span className="brutal-badge">
                  H {p.height_m ?? '—'} m
                </span>
                <span
                  className={`brutal-badge ${(p.height_source ?? 'ESTIMATED') === 'USER' ? 'brutal-badge-green' : 'brutal-badge-gold'}`}
                  title="Height provenance: ESTIMATED is not survey-grade"
                >
                  {(p.height_source ?? 'ESTIMATED') === 'USER' ? 'USER-SET' : 'ESTIMATED — NOT SURVEY-GRADE'}
                </span>
                {p.floors_override != null && (
                  <span className="brutal-badge">
                    {p.floors_override} FLOORS (USER)
                  </span>
                )}
                {p.z_base_msl_m != null && (
                  <span className="brutal-badge">
                    BASE {Number(p.z_base_msl_m).toFixed(1)} m MSL
                  </span>
                )}
                <button
                  className="brutal-btn"
                  style={{ fontSize: 9, padding: '4px 10px' }}
                  onClick={() => {
                    setEditingId(editingId === p.id ? null : p.id);
                    setDraftHeight(p.height_m != null ? String(p.height_m) : '');
                    setDraftFloors(p.floors_override != null ? String(p.floors_override) : '');
                    setEditMsg(null);
                  }}
                >
                  {editingId === p.id ? 'CANCEL EDIT' : 'EDIT H/FLOORS'}
                </button>
              </div>
              {editingId === p.id && (
                <div className="flex items-center gap-2 flex-wrap" style={{ margin: '4px 0 8px 0' }}>
                  <input
                    value={draftHeight}
                    onChange={(e) => setDraftHeight(e.target.value)}
                    placeholder="Height m"
                    type="number"
                    min="0"
                    step="0.5"
                    className="brutal-input font-mono"
                    style={{ width: 110, fontSize: 10 }}
                  />
                  <input
                    value={draftFloors}
                    onChange={(e) => setDraftFloors(e.target.value)}
                    placeholder="Floors"
                    type="number"
                    min="1"
                    step="1"
                    className="brutal-input font-mono"
                    style={{ width: 90, fontSize: 10 }}
                  />
                  <button className="brutal-btn brutal-btn-gold" style={{ fontSize: 9, padding: '6px 12px' }} onClick={() => void saveEdit(p.id)}>
                    SAVE
                  </button>
                  {editMsg && <span style={{ fontSize: 10, color: '#E5484D' }}>{editMsg}</span>}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '2px solid #111111' }}>
                <button
                  className="brutal-btn brutal-btn-danger"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => void decide(p.id, 'REJECTED')}
                >
                  REJECT
                </button>
                <button
                  className="brutal-btn brutal-btn-success"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => void decide(p.id, 'APPROVED')}
                >
                  APPROVE → ADD 3D BUILDING
                </button>
              </div>
            </div>
          ))}
          <div className="brutal-eyebrow" style={{ marginTop: 8 }}>
            FIELD-MAPPING PROPOSALS (STATIC DEMO)
          </div>
          {PROPOSALS.map((p) => {
            const st = statuses[p.id];
            return (
              <div
                key={p.id}
                className="brutal-panel"
                style={{
                  padding: 16,
                  opacity: st === 'rejected' ? 0.55 : 1,
                  borderLeft: `8px solid ${st === 'accepted' ? '#16A34A' : st === 'rejected' ? '#D92D20' : '#F5C400'}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="brutal-badge brutal-badge-black">
                        AI PROPOSAL {p.id}
                      </span>
                      <span
                        className={`brutal-badge ${p.type === 'ANOMALY' ? 'brutal-badge-gold' : ''}`}
                      >
                        {p.type}
                      </span>
                      {st !== 'pending' && (
                        <span className={st === 'accepted' ? 'brutal-badge brutal-badge-green' : 'brutal-badge brutal-badge-red'}>
                          ● {st.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="font-mono font-bold"
                        style={{ fontSize: 12, color: '#111', background: '#F4F1E8', padding: '4px 10px', border: '2px solid #111' }}>
                        {p.src}
                      </span>
                      <ArrowRight size={12} color="#111111" strokeWidth={3} />
                      <span className="font-mono font-bold"
                        style={{ fontSize: 12, color: '#111', background: '#F5C400', padding: '4px 10px', border: '2px solid #111' }}>
                        {p.dst}
                      </span>
                    </div>

                    <p style={{ fontSize: 11, color: '#333', margin: 0, lineHeight: 1.5 }}>
                      {p.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-6 shrink-0">
                    <div
                      className="font-display font-bold"
                      style={{ fontSize: 22, color: '#111' }}
                    >
                      {p.confidence}%
                    </div>
                    <div className="brutal-eyebrow" style={{ fontSize: 8 }}>
                      CONFIDENCE
                    </div>
                    <div className="progress-bar" style={{ width: 60, height: 10, marginTop: 2, border: '2px solid #111', background: '#fff' }}>
                      <div className="fill"
                        style={{
                          width: `${p.confidence}%`,
                          background: p.confidence > 90 ? '#16A34A' : '#F5C400',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {st === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '2px solid #111111' }}>
                    <button
                      className="brutal-btn brutal-btn-danger"
                      style={{ fontSize: 10, padding: '6px 14px' }}
                      onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: 'rejected' }))}
                    >
                      REJECT
                    </button>
                    <button
                      className="brutal-btn"
                      style={{ fontSize: 10, padding: '6px 14px' }}
                    >
                      EDIT
                    </button>
                    <button
                      className="brutal-btn brutal-btn-success"
                      style={{ fontSize: 10, padding: '6px 14px' }}
                      onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: 'accepted' }))}
                    >
                      ACCEPT
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
