import { useEffect } from 'react';
import { MARS_CMO_STEPS } from '../utils/reportPacket.js';

export default function MarsTriageModal({
  open = false,
  onClose,
  delayMin = 18,
  stepsDone = {},
  onToggleStep,
  notes = '',
  onNotesChange,
  queuedForGround = false,
  onQueueAndDownload,
  onDownloadTxt,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const completedCount = MARS_CMO_STEPS.filter((s) => stepsDone[s.id]).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hud-panel fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mars-cmo-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 540,
          padding: 24,
          borderColor: 'rgba(244, 63, 94, 0.4)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fb7185' }}>
              ■ Autonomous Mode · {delayMin} min one-way delay
            </div>
            <h2 id="mars-cmo-title" style={{ margin: '4px 0 0', fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>
              Crew Medical Officer Offline Checklist
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CMO checklist"
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 6,
              color: '#cbd5e1',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            Esc ✕
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#e2e8f0', marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Earth-Independent Triage Protocol</span>
            <span style={{ fontFamily: "'Space Mono', monospace", color: completedCount === 4 ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
              {completedCount} / {MARS_CMO_STEPS.length} complete
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(148, 163, 184, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(completedCount / MARS_CMO_STEPS.length) * 100}%`,
                height: '100%',
                background: completedCount === 4 ? '#10b981' : '#f43f5e',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* 4 Checklist Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {MARS_CMO_STEPS.map((item) => {
            const checked = Boolean(stepsDone[item.id]);
            return (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: checked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${checked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.16)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleStep?.(item.id)}
                  style={{ accentColor: '#10b981', marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: checked ? '#34d399' : '#f1f5f9', fontWeight: 600 }}>
                    Step {item.step}: {item.title}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.45 }}>
                    {item.detail}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* CMO Log Notes */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="mars-cmo-notes"
            style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#cbd5e1', marginBottom: 6 }}
          >
            CMO Intervention Notes (included in report packet)
          </label>
          <textarea
            id="mars-cmo-notes"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Record re-measured vitals, cabin CO₂/shielding verification, and countermeasures taken..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#090e1a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 7,
              color: '#f1f5f9',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              padding: '9px 11px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Ground Queue & Packet Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onQueueAndDownload?.('json')}
              style={{
                padding: '9px 14px',
                borderRadius: 7,
                background: queuedForGround ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.18)',
                border: `1px solid ${queuedForGround ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.5)'}`,
                color: queuedForGround ? '#34d399' : '#fecdd3',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {queuedForGround ? '✓ Queued & Downloaded (.JSON)' : 'Queue & Download Packet (.JSON)'}
            </button>
            <button
              type="button"
              onClick={() => onDownloadTxt?.()}
              style={{
                padding: '9px 12px',
                borderRadius: 7,
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬇ .TXT Summary
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 14px',
              borderRadius: 7,
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#cbd5e1',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
