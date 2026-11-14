export const MARS_CMO_STEPS = [
  {
    id: 're_measure',
    step: 1,
    title: 'Re-measure',
    detail: 'Repeat out-of-range measurements after 10–30 min rest or calibrated sensor verification (use ONSD caliper or pulse ox).',
  },
  {
    id: 'check_co2_shielding',
    step: 2,
    title: 'Check cabin CO₂ and shielding',
    detail: 'Inspect CDRA CO₂ scrubbers / ventilation fans (ppCO2 < 3.0 mmHg) and verify SPE storm shelter shielding status.',
  },
  {
    id: 'log_actions',
    step: 3,
    title: 'Log what you did',
    detail: 'Record symptoms, intervention steps taken, and updated readings in the autonomous CMO log.',
  },
  {
    id: 'queue_ground',
    step: 4,
    title: 'Queue the report for ground',
    detail: 'Package telemetry, 7-day trends, and CMO checklist status into the downlink packet for Flight Surgeon review.',
  },
];

/**
 * Computes total listed vs completed triage actions across all non-green
 * measurements plus the 4 Mars CMO offline steps when in A2 mode.
 */
export function computeActionProgress({
  measurements = {},
  recordById = {},
  actionsFor,
  guidanceDoneCountById = {},
  autonomy = 'A0',
  marsStepsDone = {},
}) {
  let guidanceTotal = 0;
  let guidanceCompleted = 0;
  const byIndicator = [];

  for (const [id, rec] of Object.entries(recordById)) {
    const m = measurements[id];
    if (!m) continue;
    const st = String(m.status || 'GREEN').toLowerCase();
    const listedActions = typeof actionsFor === 'function' ? actionsFor(rec, st, m.value) : [];
    const total = listedActions.length;
    if (total === 0) continue;

    const done = Math.min(total, Number(guidanceDoneCountById[id] || 0));
    guidanceTotal += total;
    guidanceCompleted += done;
    byIndicator.push({
      id,
      name: rec.name || m.name,
      status: m.status,
      completed: done,
      total,
      actions: listedActions,
    });
  }

  const includeMars = autonomy === 'A2';
  const marsChecklist = includeMars
    ? MARS_CMO_STEPS.map((s) => ({ ...s, completed: Boolean(marsStepsDone[s.id]) }))
    : [];
  const marsTotal = marsChecklist.length;
  const marsCompleted = marsChecklist.filter((s) => s.completed).length;

  return {
    completed: guidanceCompleted + marsCompleted,
    total: guidanceTotal + marsTotal,
    guidanceCompleted,
    guidanceTotal,
    byIndicator,
    marsChecklist,
    marsCompleted,
    marsTotal,
  };
}

/**
 * Builds a self-contained JSON report packet with current values, 7-day trends,
 * indicator statuses, cadence compliance, and completed actions.
 */
export function buildReportPacket({
  data,
  recordById = {},
  actionsFor,
  guidanceDoneCountById = {},
  marsStepsDone = {},
  marsNotes = '',
  queuedForGround = false,
}) {
  const autonomy = data?.autonomy || 'A0';
  const delaySec = Number(data?.delay_seconds ?? 0);
  const progress = computeActionProgress({
    measurements: data?.measurements || {},
    recordById,
    actionsFor,
    guidanceDoneCountById,
    autonomy,
    marsStepsDone,
  });

  const measurementList = Object.entries(data?.measurements || {})
    .filter(([key, val]) => key === val?.id)
    .map(([, m]) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      value: m.value,
      secondaryValue: m.secondaryValue ?? null,
      status: m.status,
      zScore: m.zScore,
      cadenceStatus: m.cadenceStatus || 'CURRENT',
      cadenceIntervalDays: m.cadenceIntervalDays ?? 1,
      lastMeasuredDaysAgo: m.lastMeasuredDaysAgo ?? 0,
      trend7d: Array.isArray(m.history) ? [...m.history] : [],
      reason: m.reason || null,
    }));

  return {
    packetVersion: '1.0',
    generatedAtUtc: new Date().toISOString(),
    preset: data?.preset || 'mars',
    profile: data?.profile || {},
    autonomy: {
      level: autonomy,
      triageMode: data?.overallDetails?.triageMode || autonomy,
      oneWayDelaySec: delaySec,
      oneWayDelayMin: Math.round((delaySec / 60) * 10) / 10,
      medKitStockPct: data?.autonomyDetails?.medKitStockPct ?? null,
      bannerAlert: data?.autonomyDetails?.bannerAlert ?? null,
    },
    overall: {
      score: data?.overall ?? null,
      badge: data?.badge ?? 'NOMINAL',
      redCount: data?.overallDetails?.redCount ?? 0,
      yellowCount: data?.overallDetails?.yellowCount ?? 0,
      streakDays: data?.overallDetails?.streakDays ?? 0,
      activeRedFlagSymptoms: data?.overallDetails?.activeRedFlagSymptoms || [],
    },
    dueSummary: data?.dueSummary || {
      dueCount: 0,
      overdueCount: 0,
      dueIds: [],
      overdueIds: [],
      allLogged: true,
    },
    hazards: data?.hazards || {},
    actionsProgress: {
      completed: progress.completed,
      total: progress.total,
      guidanceByIndicator: progress.byIndicator,
      marsOfflineChecklist: progress.marsChecklist,
      cmoNotes: marsNotes || '',
      queuedForGround: Boolean(queuedForGround),
    },
    measurements: measurementList,
  };
}

/**
 * Formats a built packet into human-readable telemetry plain text for offline
 * review or ground queue downlink.
 */
export function formatReportText(packet) {
  const p = packet;
  const lines = [
    '============================================================',
    'ASTRO HEALTH MONITOR — MEDICAL & TELEMETRY REPORT PACKET',
    '============================================================',
    `Generated UTC : ${p.generatedAtUtc}`,
    `Crew Member   : ${p.profile?.name || 'Crew'} (${p.profile?.id || 'N/A'}) | Mission Day ${p.profile?.missionDay ?? '?'}`,
    `Regime / Node : ${p.profile?.regime || p.preset} | Autonomy: ${p.autonomy?.level} (${p.autonomy?.oneWayDelayMin} min delay)`,
    `Overall Score : ${p.overall?.score}/100 [${p.overall?.badge}] | Red: ${p.overall?.redCount} | Yellow: ${p.overall?.yellowCount} | Streak: ${p.overall?.streakDays}d`,
    `Due Cadence   : ${p.dueSummary?.dueCount ?? 0} due (${p.dueSummary?.overdueCount ?? 0} overdue) | All Logged: ${p.dueSummary?.allLogged ? 'YES' : 'NO'}`,
    `Actions Done  : ${p.actionsProgress?.completed ?? 0}/${p.actionsProgress?.total ?? 0}`,
    '',
    '--- MEASUREMENTS & 7-DAY TREND ---',
  ];

  for (const m of p.measurements || []) {
    const valStr = m.secondaryValue != null ? `${m.value}/${m.secondaryValue}` : `${m.value}`;
    const trend = (m.trend7d || []).join(', ');
    lines.push(
      `[${m.status}] ${m.id} ${m.name}: ${valStr} ${m.unit} | Cadence: ${m.cadenceStatus} (${m.lastMeasuredDaysAgo}d/${m.cadenceIntervalDays}d) | 7d: [${trend}]`
    );
  }

  if ((p.actionsProgress?.guidanceByIndicator || []).length > 0) {
    lines.push('', '--- ACTIVE GUIDANCE ACTIONS ---');
    for (const g of p.actionsProgress.guidanceByIndicator) {
      lines.push(`${g.id} ${g.name} [${g.status}] (${g.completed}/${g.total} done):`);
      for (const a of g.actions) {
        lines.push(`  - ${a}`);
      }
    }
  }

  if ((p.actionsProgress?.marsOfflineChecklist || []).length > 0) {
    lines.push('', '--- MARS EARTH-INDEPENDENT CMO CHECKLIST ---');
    for (const step of p.actionsProgress.marsOfflineChecklist) {
      lines.push(`  [${step.completed ? 'x' : ' '}] Step ${step.step}: ${step.title}`);
    }
    if (p.actionsProgress.cmoNotes) {
      lines.push(`CMO Notes: ${p.actionsProgress.cmoNotes}`);
    }
    lines.push(`Queued for Ground: ${p.actionsProgress.queuedForGround ? 'YES' : 'NO'}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Triggers a browser file download for the report packet in `.json` or `.txt`.
 */
export function downloadReportPacket(packet, format = 'json') {
  const isTxt = format === 'txt';
  const body = isTxt ? formatReportText(packet) : JSON.stringify(packet, null, 2);
  const mime = isTxt ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
  const ext = isTxt ? 'txt' : 'json';

  const idSlug = String(packet?.profile?.id || packet?.preset || 'crew')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  const day = packet?.profile?.missionDay ?? 'x';
  const filename = `astro-report-${idSlug}-day${day}.${ext}`;

  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}
