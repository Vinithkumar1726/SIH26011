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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0D12' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #28313C' }}>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles size={14} color="#C99A45" />
          <h1 className="font-display font-semibold" style={{ fontSize: 18, color: '#F1F3F5', letterSpacing: '0.04em' }}>
            AI-ASSISTED MAPPING REVIEW
          </h1>
        </div>
        <p style={{ fontSize: 11, color: '#6E7783' }}>
          Review AI field-mapping proposals and anomaly detections. Approve or reject each item.
        </p>

        {/* Summary chips */}
        <div className="flex gap-3 mt-3">
          {[
            { label: 'PENDING', val: pending, color: '#C99A45' },
            { label: 'ACCEPTED', val: accepted, color: '#4FB8AC' },
            { label: 'REJECTED', val: rejected, color: '#C85C5C' },
          ].map((m) => (
            <div key={m.label} className="chip fade-up"
              style={{ background: '#10151C', borderColor: '#28313C', padding: '4px 12px', fontSize: 10 }}>
              <span className="font-display font-bold" style={{ fontSize: 14, color: m.color }}>{m.val}</span>
              <span style={{ fontSize: 9, color: '#6E7783', letterSpacing: '0.08em', fontFamily: 'IBM Plex Sans' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3" style={{ maxWidth: 720 }}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 11, color: '#6E7783', letterSpacing: '0.08em' }}>
              LIVE-CAPTURED BUILDINGS (FROM 3D GROUND CLICKS)
            </div>
            {!liveLoading && !liveError && live.length > 0 && (
              <span className="chip chip-gold">{live.length} PENDING</span>
            )}
          </div>
          {liveLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120, background: 'linear-gradient(90deg, #10151C 25%, #1B222C 50%, #10151C 75%)', backgroundSize: '800px 100%' }} />
              ))}
            </div>
          )}
          {liveError && (
            <div style={{ fontSize: 11, color: '#C85C5C' }}>{liveError}</div>
          )}
          {encroachNote && (
            <div style={{ fontSize: 11, color: '#E5484D', border: '1px solid #E5484D', borderRadius: 3, padding: '6px 10px' }}>{encroachNote}</div>
          )}
          {!liveLoading && !liveError && live.length === 0 && (
            <div style={{ fontSize: 11, color: '#6E7783' }}>
              No pending captures. Click ground in the 3D Explorer with Live Capture Mode on.
            </div>
          )}
          {live.map((p, li) => (
            <div
              key={p.id}
              className="fade-up"
              style={{
                background: '#10151C',
                border: '1px solid #28313C',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                animationDelay: `${Math.min(li * 50, 300)}ms`,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(201 154 69 / 0.5)'; e.currentTarget.style.boxShadow = '0 12px 32px -16px rgb(201 154 69 / 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#28313C'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono" style={{ fontSize: 9, color: '#C99A45', letterSpacing: '0.1em' }}>
                  LIVE CAPTURE {p.id.slice(0, 8)}…
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: p.source === 'synthetic_fallback' ? '#D6A84F' : '#6E7783',
                    border: '1px solid #28313C',
                    padding: '1px 6px',
                    borderRadius: 2,
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                  }}
                >
                  {(p.source ?? 'unknown').toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#A8B0BA', margin: '0 0 4px 0', lineHeight: 1.5 }}>
                Bhu-Aadhaar {p.ulpin ?? '—'} · captured{' '}
                {p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '—'}
              </p>
              {p.source === 'synthetic_fallback' && (
                <p style={{ fontSize: 11, color: '#D6A84F', margin: '0 0 4px 0' }}>
                  Synthetic 10 m box — NOT a detected building.
                </p>
              )}
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1B222C' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 10, padding: '5px 14px' }}
                  onClick={() => void decide(p.id, 'REJECTED')}
                >
                  REJECT
                </button>
                <button
                  className="btn-primary"
                  style={{ fontSize: 10, padding: '5px 14px' }}
                  onClick={() => void decide(p.id, 'APPROVED')}
                >
                  APPROVE → ADD 3D BUILDING
                </button>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#6E7783', letterSpacing: '0.08em', marginTop: 8 }}>
            FIELD-MAPPING PROPOSALS (STATIC DEMO)
          </div>
          {PROPOSALS.map((p) => {
            const st = statuses[p.id];
            return (
              <div
                key={p.id}
                className="fade-in"
                style={{
                  background: '#10151C',
                  border: `1px solid ${st === 'accepted' ? '#4FB8AC' : st === 'rejected' ? '#C85C5C' : '#28313C'}`,
                  borderRadius: 3,
                  padding: 16,
                  opacity: st === 'rejected' ? 0.5 : 1,
                  transition: 'opacity 0.2s, border-color 0.2s',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono" style={{ fontSize: 9, color: '#C99A45', letterSpacing: '0.1em' }}>
                        AI PROPOSAL {p.id}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: p.type === 'ANOMALY' ? '#D6A84F' : '#6E7783',
                          border: `1px solid ${p.type === 'ANOMALY' ? '#D6A84F' : '#28313C'}`,
                          padding: '1px 6px',
                          borderRadius: 2,
                          letterSpacing: '0.08em',
                          fontFamily: 'IBM Plex Sans',
                          fontWeight: 600,
                        }}
                      >
                        {p.type}
                      </span>
                      {st !== 'pending' && (
                        <span className={st === 'accepted' ? 'tag-valid' : 'tag-error'}>
                          {st.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono"
                        style={{ fontSize: 12, color: '#A8B0BA', background: '#151B23', padding: '3px 10px', borderRadius: 2, border: '1px solid #28313C' }}>
                        {p.src}
                      </span>
                      <ArrowRight size={12} color="#C99A45" />
                      <span className="font-mono"
                        style={{ fontSize: 12, color: '#F1F3F5', background: '#151B23', padding: '3px 10px', borderRadius: 2, border: '1px solid #28313C' }}>
                        {p.dst}
                      </span>
                    </div>

                    <p style={{ fontSize: 11, color: '#A8B0BA', margin: 0, lineHeight: 1.5 }}>
                      {p.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-6 shrink-0">
                    <div
                      className="font-display font-bold"
                      style={{ fontSize: 22, color: p.confidence > 90 ? '#4FB8AC' : p.confidence > 80 ? '#C99A45' : '#D6A84F' }}
                    >
                      {p.confidence}%
                    </div>
                    <div style={{ fontSize: 8, color: '#6E7783', letterSpacing: '0.08em', fontFamily: 'IBM Plex Sans' }}>
                      CONFIDENCE
                    </div>
                    <div className="progress-bar" style={{ width: 60, height: 3, marginTop: 2 }}>
                      <div className="fill"
                        style={{
                          width: `${p.confidence}%`,
                          background: p.confidence > 90 ? '#4FB8AC' : '#C99A45',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {st === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #1B222C' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 10, padding: '5px 14px' }}
                      onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: 'rejected' }))}
                    >
                      REJECT
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 10, padding: '5px 14px', border: '1px solid #28313C' }}
                    >
                      EDIT
                    </button>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 10, padding: '5px 14px' }}
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
