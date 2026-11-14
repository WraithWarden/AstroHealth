/**
 * Evaluates check-in cadence compliance per indicator by comparing each reading's
 * `lastMeasuredDaysAgo` against `cadence.routineIntervalDays` from indicators.json.
 */
export function evaluateCadence(byId, rawReadings = {}) {
  const byMeasurement = {};
  const dueIds = [];
  const overdueIds = [];

  for (const [id, spec] of Object.entries(byId || {})) {
    const interval = Number(spec?.cadence?.routineIntervalDays) || 1;
    const raw = rawReadings?.[id];
    const daysAgo = Number(raw?.lastMeasuredDaysAgo ?? 0);
    const isContext = spec?.cardId === 'context';

    let cadenceStatus = 'CURRENT';
    if (!isContext && daysAgo > interval) {
      cadenceStatus = 'OVERDUE';
      overdueIds.push(id);
      dueIds.push(id);
    } else if (!isContext && daysAgo === interval) {
      cadenceStatus = 'DUE_NOW';
      dueIds.push(id);
    }

    byMeasurement[id] = {
      cadenceStatus,
      cadenceIntervalDays: interval,
      lastMeasuredDaysAgo: daysAgo,
    };
  }

  return {
    byMeasurement,
    summary: {
      dueCount: dueIds.length,
      overdueCount: overdueIds.length,
      dueIds,
      overdueIds,
      allLogged: dueIds.length === 0,
    },
  };
}
