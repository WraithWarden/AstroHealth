import { useEffect, useId, useRef, useState } from "react";

// Usage:
// <CheckInModal
//   open={open}
//   onClose={() => setOpen(false)}
//   defaults={{ sbp: 112, dbp: 71 }}          // optional: override baseline pre-fill
//   auto={{ radiation: 0.48, co2: 2.3 }}      // filled automatically, read-only
//   pvt={{ median_ms: 262, lapses: 0 }}       // from PvtTest, or null
//   onSubmit={(reading) => ...}               // reading is keyed by measurement id
// />
// If docs/CONTRACT.md uses a different reading shape, only buildReading() needs to change.

const FIELDS = [
  { key: "sbp", id: "1A-i", label: "Blood pressure, top number (systolic)", unit: "mm Hg", min: 60, max: 220, step: 1, def: 112 },
  { key: "dbp", id: "1A-i", label: "Blood pressure, bottom number (diastolic)", unit: "mm Hg", min: 30, max: 140, step: 1, def: 71 },
  { key: "hr", id: "1A-ii", label: "Resting heart rate", unit: "bpm", min: 30, max: 200, step: 1, def: 62 },
  { key: "spo2", id: "4A-i", label: "Blood oxygen (SpO₂)", unit: "%", min: 70, max: 100, step: 1, def: 98 },
  { key: "temp", id: "2B-ii", label: "Body temperature", unit: "°C", min: 34, max: 42, step: 0.1, def: 37.1 },
  { key: "sleep", id: "3A-i", label: "Sleep last night", unit: "hours", min: 0, max: 14, step: 0.1, def: 6.4 },
  { key: "mood", id: "3B-i", label: "Mood / stress (1 = calm, 10 = very stressed)", unit: "1–10", min: 1, max: 10, step: 1, def: 3 },
  { key: "glucose", id: "4B-i", label: "Fasting glucose", unit: "mg/dL", min: 30, max: 400, step: 1, def: 90 },
];

const initialValues = (defaults) =>
  Object.fromEntries(
    FIELDS.map((f) => [f.key, String(defaults?.[f.key] ?? f.def)])
  );

function validate(field, raw) {
  if (raw === "" || raw == null) return "Enter a value.";
  const n = Number(raw);
  if (Number.isNaN(n)) return "Enter a number.";
  if (n < field.min || n > field.max) {
    return `Enter a value between ${field.min} and ${field.max} ${field.unit}.`;
  }
  return "";
}

function buildReading(values, pvt, auto) {
  const n = (k) => Number(values[k]);
  return {
    "1A-i": { sbp: n("sbp"), dbp: n("dbp") },
    "1A-ii": n("hr"),
    "4A-i": n("spo2"),
    "2B-ii": n("temp"),
    "3A-i": n("sleep"),
    "3B-i": n("mood"),
    "4B-i": n("glucose"),
    ...(pvt ? { "3A-ii": { median_ms: pvt.median_ms, lapses: pvt.lapses } } : {}),
    ...(auto?.radiation != null ? { "2A-i": auto.radiation } : {}),
    ...(auto?.co2 != null ? { "4A-ii": auto.co2 } : {}),
  };
}

export default function CheckInModal({
  open,
  onClose,
  onSubmit,
  defaults,
  auto,
  pvt,
}) {
  const [values, setValues] = useState(() => initialValues(defaults));
  const [errors, setErrors] = useState({});
  const firstRef = useRef(null);
  const uid = useId();

  // Reset to baseline values every time the form opens.
  useEffect(() => {
    if (!open) return undefined;
    setValues(initialValues(defaults));
    setErrors({});
    firstRef.current?.focus();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setValue = (key, v) => setValues((s) => ({ ...s, [key]: v }));

  const checkOne = (f) =>
    setErrors((e) => ({ ...e, [f.key]: validate(f, values[f.key]) }));

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    FIELDS.forEach((f) => {
      const msg = validate(f, values[f.key]);
      if (msg) next[f.key] = msg;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit?.(buildReading(values, pvt, auto));
  };

  const titleId = `${uid}-title`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        noValidate
        className="relative flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Daily check-in
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Fields start at your space baseline. Change anything that is different today.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in"
            className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {FIELDS.map((f, i) => {
              const inputId = `${uid}-${f.key}`;
              const errId = `${inputId}-err`;
              const err = errors[f.key];
              return (
                <div key={f.key}>
                  <label htmlFor={inputId} className="mb-1 block text-sm text-slate-200">
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={i === 0 ? firstRef : undefined}
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={values[f.key]}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      onBlur={() => checkOne(f)}
                      aria-invalid={err ? "true" : "false"}
                      aria-describedby={err ? errId : undefined}
                      className={`w-28 rounded border bg-slate-800 px-2 py-1.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        err ? "border-red-400" : "border-slate-600"
                      }`}
                    />
                    <span className="text-sm text-slate-400">{f.unit}</span>
                  </div>
                  {err && (
                    <p id={errId} role="alert" className="mt-1 text-xs text-red-300">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 rounded border border-slate-700 bg-slate-800/50 p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-400">Reaction test (PVT-lite)</p>
              <p className="text-slate-100">
                {pvt
                  ? `${pvt.median_ms} ms median, ${pvt.lapses} ${pvt.lapses === 1 ? "lapse" : "lapses"}`
                  : "Not taken yet. Run the test to add it."}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Filled in automatically</p>
              <p className="text-slate-100">
                Radiation: {auto?.radiation != null ? `${auto.radiation} mSv/day` : "no feed"}
              </p>
              <p className="text-slate-100">
                Cabin CO₂: {auto?.co2 != null ? `${auto.co2} mm Hg` : "no feed"}
              </p>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-700 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              setValues(initialValues(defaults));
              setErrors({});
            }}
            className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Reset to baseline
          </button>
          <button
            type="submit"
            className="rounded bg-sky-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Save check-in
          </button>
        </footer>
      </form>
    </div>
  );
}
