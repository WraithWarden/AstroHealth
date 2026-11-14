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
          maxWidth: 520,
          padding: 20,
          borderColor: 'rgba(255,51,85,0.45)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, letterSpacing: '0.16em', color: '#ff3355', fontWeight: 700 }}>
              ◆ AUTONOMOUS MODE · {delayMin} MIN ONE-WAY DELAY
            </div>
            <h2 id="mars-cmo-title" style={{ margin: '4px 0 0', fontFamily: "'Orbitron', sans-serif", fontSize: 13, letterSpacing: '0.1em', color: '#c8e4ff' }}>
              CREW MEDICAL OFFICER OFFLINE CHECKLIST
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CMO checklist"
            style={{
              background: 'none',
              border: '1px solid rgba(0,180,255,0.25)',
              color: 'rgba(200,228,255,0.7)',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            ESC
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14, padding: '8px 10px', background: 'rgba(255,51,85,0.06)', border: '1px solid rgba(255,51,85,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(200,228,255,0.75)', marginBottom: 5 }}>
            <span>EARTH-INDEPENDENT TRIAGE PROTOCOL</span>
            <span style={{ color: completedCount === 4 ? '#00ff9d' : '#ffc800', fontWeight: 700 }}>
              {completedCount} / {MARS_CMO_STEPS.length} COMPLETE
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(completedCount / MARS_CMO_STEPS.length) * 100}%`,
                height: '100%',
                background: completedCount === 4 ? '#00ff9d' : '#ff3355',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* 4 Checklist Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {MARS_CMO_STEPS.map((item) => {
            const checked = Boolean(stepsDone[item.id]);
            return (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '9px 10px',
                  cursor: 'pointer',
                  background: checked ? 'rgba(0,255,157,0.06)' : 'rgba(0,180,255,0.03)',
                  border: `1px solid ${checked ? 'rgba(0,255,157,0.3)' : 'rgba(0,180,255,0.16)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleStep?.(item.id)}
                  style={{ accentColor: '#00ff9d', marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.08em', color: checked ? '#00ff9d' : '#c8e4ff', fontWeight: 700 }}>
                    STEP {item.step} · {item.title.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: checked ? 'rgba(200,228,255,0.5)' : 'rgba(200,228,255,0.75)', marginTop: 3, lineHeight: 1.4 }}>
                    {item.detail}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* CMO Log Notes */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="mars-cmo-notes"
            style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(0,180,255,0.7)', marginBottom: 5, letterSpacing: '0.08em' }}
          >
            CMO INTERVENTION LOG (ATTACHED TO REPORT PACKET)
          </label>
          <textarea
            id="mars-cmo-notes"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Record re-measured vitals, scrubber/shielding status, and actions administered..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(4,12,24,0.85)',
              border: '1px solid rgba(0,180,255,0.25)',
              color: '#c8e4ff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              padding: '8px 10px',
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
                padding: '8px 12px',
                background: queuedForGround ? 'rgba(0,255,157,0.14)' : 'rgba(255,51,85,0.14)',
                border: `1px solid ${queuedForGround ? 'rgba(0,255,157,0.55)' : 'rgba(255,51,85,0.55)'}`,
                color: queuedForGround ? '#00ff9d' : '#ff8a9e',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {queuedForGround ? '✓ QUEUED & DOWNLOADED (.JSON)' : 'QUEUE & DOWNLOAD PACKET (.JSON)'}
            </button>
            <button
              type="button"
              onClick={() => onDownloadTxt?.()}
              style={{
                padding: '8px 10px',
                background: 'rgba(0,180,255,0.08)',
                border: '1px solid rgba(0,180,255,0.3)',
                color: '#00b4ff',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              ⬇ .TXT SUMMARY
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px',
              background: 'none',
              border: '1px solid rgba(200,228,255,0.2)',
              color: 'rgba(200,228,255,0.7)',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
