// Average a RadLab export (CSV or TSV) per day.
//
// Step 1: node scripts/radlab-daily.mjs export.csv
//         -> prints the column names and which ones are numeric. Check the UNIT here.
// Step 2: node scripts/radlab-daily.mjs export.csv --value "<column name>" [--time "<column name>"]
//         -> prints one average per day and a JSON array you can paste into the preset.
//
// Column names are not hard-coded because they depend on the instrument you export.
import fs from "node:fs";

const args = process.argv.slice(2);
const file = args[0];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

if (!file) {
  console.error('Usage: node scripts/radlab-daily.mjs export.csv [--value "column"] [--time "column"]');
  process.exit(1);
}

const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
const delim = lines[0].includes("\t") ? "\t" : ",";

function splitLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const headers = splitLine(lines[0]);
const rows = lines.slice(1).map(splitLine);

const timeCol = opt("time") || headers.find((h) => /time|date/i.test(h));
const timeIdx = headers.indexOf(timeCol);
if (timeIdx < 0) {
  console.error("Could not find a time column. Headers:", headers.join(" | "));
  console.error('Pass it with --time "column name".');
  process.exit(1);
}

const numericCols = headers.filter((h, i) => {
  if (i === timeIdx) return false;
  const vals = rows.map((r) => r[i]).filter((v) => v !== undefined && v !== "");
  return vals.length > 0 && vals.filter((v) => Number.isFinite(Number(v))).length / vals.length > 0.8;
});

const valueCol = opt("value");
if (!valueCol) {
  console.log(`Rows: ${rows.length}   Time column: ${timeCol}`);
  console.log("All columns:", headers.join(" | "));
  console.log("Numeric columns:", numericCols.join(" | "));
  console.log('\nCheck whether the value is absorbed dose (Gy) or dose equivalent (Sv).');
  console.log('Then run again with --value "<column name>".');
  process.exit(0);
}

const valIdx = headers.indexOf(valueCol);
if (valIdx < 0) {
  console.error(`Column "${valueCol}" not found. Headers:`, headers.join(" | "));
  process.exit(1);
}

const byDay = new Map();
for (const r of rows) {
  const v = Number(r[valIdx]);
  const d = new Date(r[timeIdx]);
  if (!Number.isFinite(v) || Number.isNaN(d.getTime())) continue;
  const day = d.toISOString().slice(0, 10);
  const acc = byDay.get(day) || { sum: 0, n: 0 };
  acc.sum += v;
  acc.n += 1;
  byDay.set(day, acc);
}

const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
console.log(`Daily average of "${valueCol}" (last ${days.length} days with data)`);
for (const [day, { sum, n }] of days) {
  console.log(`${day}  ${(sum / n).toPrecision(4)}  (${n} samples)`);
}
console.log(
  "\nJSON:",
  JSON.stringify(days.map(([day, { sum, n }]) => ({ day, value: Number((sum / n).toPrecision(4)) })))
);
