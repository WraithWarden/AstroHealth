import { useEffect, useId, useRef, useState } from "react";

// Usage: <InstructionDrawer record={sleepRecord} open={open} onClose={() => setOpen(false)} />
// `record` is one object from src/data/*.json (see TEMPLATE.json).

const TABS = [
  { id: "how", label: "How to measure" },
  { id: "why", label: "Why" },
];

const SOURCE_LABELS = {
  S: "NASA-STD-3001 standard",
  L: "NASA HRP / ISS flight research",
  C: "Standard clinical threshold",
  H: "Operational triage heuristic (illustrative, not a NASA limit)",
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function List({ items, ordered = false }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-1.5 pl-5 marker:text-slate-500 ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {items.map((text, i) => (
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

  // Reset to the first tab and move focus into the drawer when it opens.
  useEffect(() => {
    if (!open) return undefined;
    setTab("how");
    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();
    return () => returnFocusTo.current?.focus?.();
  }, [open, record?.id]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !record) return null;

  // Keep Tab inside the drawer while it is open.
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

  // Left/Right arrows switch tabs.
  const onTabKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`${uid}-tab-${next.id}`)?.focus();
  };

  const titleId = `${uid}-title`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="relative flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-xl"
      >
        <header className="border-b border-slate-700 px-5 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-white">
                {record.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {record.id} · {record.node} · {record.unit}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close instructions"
              className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Close
            </button>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-400">Earth normal</dt>
              <dd className="text-slate-200">{record.earth_range?.text}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Your space baseline</dt>
              <dd className="text-slate-200">{record.baseline?.text}</dd>
            </div>
          </dl>

          <div
            role="tablist"
            aria-label="Instruction sections"
            onKeyDown={onTabKey}
            className="mt-4 flex gap-1"
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
                  className={`rounded-t px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    selected
                      ? "border-b-2 border-sky-400 font-medium text-white"
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
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {tab === "how" ? (
            <>
              <Section title="What you need">
                <List items={record.equipment} />
              </Section>
              <Section title="Steps">
                <List items={record.steps} ordered />
              </Section>
              <Section title="When">
                <p>{record.when}</p>
              </Section>
              <Section title="Common mistakes">
                <List items={record.mistakes} />
              </Section>
              <Section title="Escalate if">
                <List items={record.escalate_if} />
              </Section>
            </>
          ) : (
            <>
              <Section title="Why this matters">
                <p>{record.why}</p>
              </Section>
              <Section title="Benefits of checking">
                <List items={record.benefits} />
              </Section>
              <Section title="Where the limits come from">
                <ul className="space-y-1">
                  {(record.source_tag || []).map((t) => (
                    <li key={t}>
                      <span className="font-medium text-slate-100">{t}</span>:{" "}
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
