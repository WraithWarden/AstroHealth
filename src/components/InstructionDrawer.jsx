import { useEffect, useId, useRef, useState } from "react";

const TABS = [
  { id: "how", label: "How to Measure" },
  { id: "why", label: "Why & Citations" },
];

const SOURCE_LABELS = {
  S: "NASA-STD-3001 Spaceflight Human-System Standard",
  L: "NASA HRP / ISS Flight Medical Literature",
  C: "Standard Terrestrial Clinical Threshold",
  H: "Operational Triage Heuristic (illustrative, not a NASA limit)",
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const toArr = (x) => (Array.isArray(x) ? x : typeof x === "string" && x.trim() ? [x] : []);

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-slate-200">{children}</div>
    </section>
  );
}

function List({ items, ordered = false }) {
  const safeItems = toArr(items);
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-2 pl-5 marker:text-sky-400 ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {safeItems.map((text, i) => (
        <li key={i}>{text}</li>
      ))}
    </Tag>
  );
}

export default function InstructionDrawer({ record, open, onClose }) {
  const [tab, setTab] = useState("how");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusTo = useRef(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return undefined;
    setTab("how");
    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();
    return () => returnFocusTo.current?.focus?.();
  }, [open, record?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !record) return null;

  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    const items = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onTabKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`${uid}-tab-${next.id}`)?.focus();
  };

  const titleId = `${uid}-title`;
  const sourceTags = toArr(record.source_tag);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="relative flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-[#0d1422] shadow-2xl"
      >
        <header className="border-b border-slate-800 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                Clinical Measurement Protocol
              </div>
              <h2 id={titleId} className="mt-1 text-lg font-semibold text-slate-100">
                {record.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-400">
                {record.id} · {record.node} · {record.unit}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close instructions"
              className="rounded-md border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Esc ✕
            </button>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <div>
              <dt className="text-slate-400">Earth Normal</dt>
              <dd className="mt-0.5 font-mono font-medium text-slate-100">
                {record.earth_range?.text || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Space Baseline</dt>
              <dd className="mt-0.5 font-mono font-medium text-slate-100">
                {record.baseline?.text || "—"}
              </dd>
            </div>
          </dl>

          <div
            role="tablist"
            aria-label="Instruction sections"
            onKeyDown={onTabKey}
            className="mt-4 flex gap-2"
          >
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  id={`${uid}-tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${uid}-panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`rounded-t-md px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    selected
                      ? "border-b-2 border-sky-400 bg-sky-500/10 text-sky-300"
                      : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        <div
          id={`${uid}-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${tab}`}
          className="flex-1 overflow-y-auto px-5 py-5"
        >
          {tab === "how" ? (
            <>
              <Section title="Equipment Needed">
                <List items={record.equipment} />
              </Section>
              <Section title="Step-by-Step Procedure">
                <List items={record.steps} ordered />
              </Section>
              <Section title="Cadence & Timing">
                <p>{record.when}</p>
              </Section>
              <Section title="Common Mistakes to Avoid">
                <List items={record.mistakes} />
              </Section>
              <Section title="When to Escalate">
                <List items={record.escalate_if} />
              </Section>
            </>
          ) : (
            <>
              <Section title="Spaceflight Physiology">
                <p>{record.why}</p>
              </Section>
              <Section title="Clinical Benefits">
                <List items={record.benefits} />
              </Section>
              <Section title="Standards & Evidence Sources">
                <ul className="space-y-2 text-xs text-slate-300">
                  {sourceTags.map((t) => (
                    <li key={t} className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
                      <span className="font-mono font-bold text-sky-400">[{t}]</span>{" "}
                      {SOURCE_LABELS[t] || t}
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
