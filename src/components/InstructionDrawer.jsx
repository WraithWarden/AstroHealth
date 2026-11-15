import { useEffect, useId, useRef, useState } from "react";

const TABS = [
  { id: "how", label: "How to Measure" },
  { id: "why", label: "Why" },
];

const SOURCE_META = {
  S: {
    title: "NASA-STD-3001 Spaceflight Human-System Standard",
    subtitle: "nasa.gov/ochmo/human-spaceflight-and-aviation-standards",
    href: "https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards/",
  },
  L: {
    title: "NASA HRP / ISS Flight Medical Literature",
    subtitle: "nasa.gov/hrp/risks",
    href: "https://www.nasa.gov/hrp/risks/",
  },
  C: {
    title: "Standard Terrestrial Clinical Threshold",
    subtitle: "medlineplus.gov/vitalsigns",
    href: "https://medlineplus.gov/vitalsigns.html",
  },
  H: {
    title: "Operational Triage Heuristic",
    subtitle: "nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs",
    href: "https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/",
  },
};

const RECORD_LINK_OVERRIDES = {
  "1B-i": {
    L: {
      subtitle: "nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans",
      href: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
    },
  },
  "1B-ii": {
    L: {
      subtitle: "nasa.gov/reference/risk-of-spaceflight-induced-bone-changes",
      href: "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
    },
  },
  "2A-i": {
    S: {
      subtitle: "nasa.gov/reference/nasa-std-3001v1",
      href: "https://www.nasa.gov/reference/nasa-std-3001v1/",
    },
    L: {
      subtitle: "nasa.gov/reference/risk-of-radiation-induced-cancers",
      href: "https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/",
    },
  },
  "2A-ii": {
    S: {
      subtitle: "nasa.gov/reference/nasa-std-3001v1",
      href: "https://www.nasa.gov/reference/nasa-std-3001v1/",
    },
  },
  "3A-i": {
    L: {
      subtitle: "nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules",
      href: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
    },
  },
  "3A-ii": {
    L: {
      subtitle: "nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules",
      href: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
    },
  },
  "3B-i": {
    L: {
      subtitle: "nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders",
      href: "https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/",
    },
  },
  "4A-ii": {
    S: {
      subtitle: "nasa.gov/reference/nasa-std-3001v2",
      href: "https://www.nasa.gov/reference/nasa-std-3001v2/",
    },
  },
  "4B-i": {
    C: {
      subtitle: "medlineplus.gov/bloodglucose",
      href: "https://medlineplus.gov/bloodglucose.html",
    },
  },
  "5A": {
    S: {
      subtitle: "nasa.gov/reference/nasa-std-3001v1",
      href: "https://www.nasa.gov/reference/nasa-std-3001v1/",
    },
  },
};

const HAZARD_LINK_BY_PREFIX = {
  "1": { subtitle: "nasa.gov/hrp/hazard-gravity-fields", href: "https://www.nasa.gov/hrp/hazard-gravity-fields/" },
  "2": { subtitle: "nasa.gov/hrp/hazard-space-radiation", href: "https://www.nasa.gov/hrp/hazard-space-radiation/" },
  "3": { subtitle: "nasa.gov/hrp/hazard-isolation-and-confinement", href: "https://www.nasa.gov/hrp/hazard-isolation-and-confinement/" },
  "4": { subtitle: "nasa.gov/hrp/hazard-hostile-closed-environments", href: "https://www.nasa.gov/hrp/hazard-hostile-closed-environments/" },
  "5": { subtitle: "nasa.gov/hrp/hazard-distance-from-earth", href: "https://www.nasa.gov/hrp/hazard-distance-from-earth/" },
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

export default function InstructionDrawer({ record, open, onClose, sideBySide = false }) {
  const [tab, setTab] = useState("how");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusTo = useRef(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    setTab("how");
  }, [open, record?.id]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();
    return () => returnFocusTo.current?.focus?.();
  }, [open]);

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
  const recordOverrides = RECORD_LINK_OVERRIDES[record.id] || {};
  const referenceLinks = sourceTags.map((t) => ({
    code: t,
    title: recordOverrides[t]?.title || SOURCE_META[t]?.title || t,
    subtitle: recordOverrides[t]?.subtitle || SOURCE_META[t]?.subtitle || "nasa.gov",
    href: recordOverrides[t]?.href || SOURCE_META[t]?.href || "https://www.nasa.gov/hrp/hazards/",
  }));

  if (record.id?.startsWith("2A")) {
    referenceLinks.push({
      code: "OSDR",
      title: "NASA OSDR Visualization Portal (RadLab / EDA Radiation Telemetry)",
      subtitle: "visualization.osdr.nasa.gov",
      href: "https://visualization.osdr.nasa.gov/",
    });
  } else if (!sourceTags.includes("S") && !sourceTags.includes("L")) {
    const hazardLink = HAZARD_LINK_BY_PREFIX[record.id?.[0]];
    referenceLinks.push({
      code: "HRP",
      title: "NASA 5 Hazards of Human Spaceflight",
      subtitle: hazardLink?.subtitle || "nasa.gov/hrp/hazards",
      href: hazardLink?.href || "https://www.nasa.gov/hrp/hazards/",
    });
  }

  return (
    <div className={`fixed inset-0 flex justify-end ${sideBySide ? 'z-[60] pointer-events-none' : 'z-50'}`}>
      <div
        className={`absolute inset-0 bg-slate-950/75 backdrop-blur-sm ${sideBySide ? 'pointer-events-auto min-[1080px]:hidden' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={!sideBySide}
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="pointer-events-auto relative flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-[#0d1422] shadow-2xl"
      >
        <header className="border-b border-slate-800 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              {sideBySide && (
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-300">
                  CHECK-IN STAYS OPEN WHILE YOU READ
                </div>
              )}
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
              <Section title="Standards &amp; Evidence Sources">
                <ul className="space-y-2 text-xs text-slate-300">
                  {referenceLinks.map((ref) => (
                    <li key={`${ref.code}-${ref.href}`}>
                      <a
                        href={ref.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 transition-colors hover:border-sky-500/50 hover:bg-slate-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <div className="min-w-0">
                          <div className="leading-snug text-slate-200 group-hover:text-white">
                            <span className="mr-1.5 font-mono font-bold text-sky-400">
                              [{ref.code}]
                            </span>
                            {ref.title}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400 group-hover:text-sky-300">
                            {ref.subtitle}
                          </div>
                        </div>
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-mono text-xs text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-400"
                        >
                          ↗
                        </span>
                      </a>
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
