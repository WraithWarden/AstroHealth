/**
 * Evaluates Hazard 5 context telemetry (5A comm delay & 5B medical kit stock)
 * to determine mission Autonomy Level and Level of Care.
 *
 * @param {Object} [reading5A={}] Reading for 5A One-Way Comm Delay
 * @param {Object} [reading5B={}] Reading for 5B Medical Kit Stock
 * @returns {Object} Autonomy metadata
 */
export function evaluateAutonomy(reading5A = {}, reading5B = {}) {
  const commDelayMin = Number(reading5A.value ?? 0);
  const commDelaySec = Number(reading5A.commDelaySec ?? Math.round(commDelayMin * 60));
  const medKitStockPct = Number(reading5B.value ?? 100);
  const criticalDepleted = Boolean(reading5B.criticalItemDepleted);

  let level = 'A0';
  let levelOfCare = 'Level of Care III';
  let bannerAlert = null;

  if (commDelaySec > 300) {
    level = 'A2';
    levelOfCare = 'Level of Care V';
    bannerAlert = `MARS COMM DELAY (${Math.round(commDelayMin)} MIN ONE-WAY): Earth-Independent Triage Mode (A2 / Level of Care V) Active.`;
  } else if (commDelaySec >= 5) {
    level = 'A1';
    levelOfCare = 'Level of Care IV';
    bannerAlert = `DELAYED COMM OPERATIONS (${commDelaySec}s ONE-WAY): Asynchronous Telemedicine Mode (A1) Active.`;
  }

  let medKitStatus = 'NOMINAL';
  if (criticalDepleted || medKitStockPct < 50) {
    medKitStatus = 'CRITICAL';
  } else if (medKitStockPct < 70) {
    medKitStatus = 'WARNING';
  }

  return {
    level,
    levelOfCare,
    commDelayMin,
    commDelaySec,
    medKitStockPct,
    medKitStatus,
    bannerAlert,
  };
}
