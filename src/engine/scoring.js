import { worstStatus, STATUS_TO_BADGE } from './indicatorHelpers.js';

export const CARD_METADATA = {
  '1A': { hazardId: 'H1', title: 'Cardiovascular & Hemodynamics', measurementIds: ['1A-i', '1A-ii'] },
  '1B': { hazardId: 'H1', title: 'Neuro-Ocular (SANS) & Skeletal Calcium', measurementIds: ['1B-i', '1B-ii'] },
  '2A': { hazardId: 'H2', title: 'Acute & Cumulative Radiologic Exposure', measurementIds: ['2A-i', '2A-ii'] },
  '2B': { hazardId: 'H2', title: 'Hostile Environmental Immune & Thermoregulation', measurementIds: ['2B-i', '2B-ii'] },
  '3A': { hazardId: 'H3', title: 'Sleep Architecture & Neurobehavioral Performance', measurementIds: ['3A-i', '3A-ii'] },
  '3B': { hazardId: 'H3', title: 'Autonomic & Psychosocial Stress', measurementIds: ['3B-i', '3B-ii'] },
  '4A': { hazardId: 'H4', title: 'Respiratory Gas Dynamics', measurementIds: ['4A-i', '4A-ii'] },
  '4B': { hazardId: 'H4', title: 'Metabolic & Integumentary Integrity', measurementIds: ['4B-i', '4B-ii'] },
  '5A': { hazardId: 'H5', title: 'Telecommunication Latency & Ground Reachability', measurementIds: ['5A'] },
  '5B': { hazardId: 'H5', title: 'Medical Consumables Buffer', measurementIds: ['5B'] },
};

export const HAZARD_METADATA = [
  { id: 'H1', number: 1, name: 'Altered Gravity Fields', cards: ['1A', '1B'] },
  { id: 'H2', number: 2, name: 'Space Radiation & Immune', cards: ['2A', '2B'] },
  { id: 'H3', number: 3, name: 'Isolation & Confinement', cards: ['3A', '3B'] },
  { id: 'H4', number: 4, name: 'Hostile Closed Environment', cards: ['4A', '4B'] },
];

/**
 * Computes Stage 4 linear interpolated score (0-100) for a single indicator.
 * Uses the lower of drift-interpolated score and threshold-interpolated score,
 * and clamps strictly within the final status band.
 *
 * @param {'GREEN'|'YELLOW'|'RED'} status Final indicator status
 * @param {number} effectiveZ Directional z-score magnitude (>= 0)
 * @param {number|null} [thresholdScore=null] Optional threshold-based score
 * @param {boolean} [trending=false] Whether status was promoted by Stage 3 trend
 * @returns {number} Integer score 0-100
 */
export function scoreMeasurement(status, effectiveZ = 0, thresholdScore = null, trending = false) {
  let driftScore;
  if (effectiveZ >= 3.0) {
    driftScore = 49 - Math.min(1, (effectiveZ - 3.0) / 2.0) * 49;
  } else if (effectiveZ >= 2.0) {
    driftScore = 79 - (effectiveZ - 2.0) * 29;
  } else {
    driftScore = 100 - (effectiveZ / 2.0) * 20;
  }

  let rawScore = Math.round(driftScore);
  if (thresholdScore != null) {
    rawScore = Math.min(rawScore, Math.round(thresholdScore));
  }

  // Enforce band boundaries per Stage 4 contract
  if (status === 'RED') {
    return Math.max(0, Math.min(49, rawScore));
  }
  if (status === 'YELLOW') {
    if (trending && rawScore > 79) return 79;
    return Math.max(50, Math.min(79, rawScore));
  }
  return Math.max(80, Math.min(100, rawScore));
}

/**
 * Aggregates individual indicator evaluations into cards, hazards (with Red-Floor capping),
 * anatomical nodes, and overall mission score (with Autonomy Penalty).
 *
 * @param {Object} byId Evaluated measurements keyed by indicator ID ('1A-i'..'5B')
 * @param {string} autonomyLevel 'A0' | 'A1' | 'A2'
 * @param {string[]} [activeRedFlagSymptoms=[]] Active red-flag symptom names
 * @returns {Object} Aggregated cards, hazards, nodes, overall, and badge
 */
export function aggregateScores(byId, autonomyLevel = 'A0', activeRedFlagSymptoms = []) {
  // 1. Build Cards
  const cardsMap = {};
  const cards = Object.entries(CARD_METADATA).map(([cardId, meta]) => {
    const items = meta.measurementIds.map(id => byId[id]).filter(Boolean);
    const score = items.length ? Math.min(...items.map(i => i.score)) : 100;
    const status = items.reduce((acc, item) => worstStatus(acc, item.status), 'GREEN');
    const cardObj = {
      id: cardId,
      hazardId: meta.hazardId,
      title: meta.title,
      score,
      status,
      measurementIds: meta.measurementIds,
    };
    cardsMap[cardId] = cardObj;
    return cardObj;
  });

  // 2. Build Physiological Hazards (H1-H4; H5 is context-only and never scored)
  const hazards = HAZARD_METADATA.map((meta) => {
    const c1 = cardsMap[meta.cards[0]];
    const c2 = cardsMap[meta.cards[1]];
    const rawMean = (c1.score + c2.score) / 2;
    const hasRedCard = c1.status === 'RED' || c2.status === 'RED';
    const score = hasRedCard ? Math.min(49, Math.round(rawMean)) : Math.round(rawMean);
    const status = worstStatus(c1.status, c2.status);

    return {
      id: meta.number,
      hazardId: meta.id,
      number: meta.number,
      name: meta.name,
      score,
      rawAverage: Math.round(rawMean),
      cappedByRedFloor: hasRedCard,
      status,
      triageStatus: STATUS_TO_BADGE[status],
      cards: meta.cards,
    };
  });

  // 3. Count physiological alerts (exclude 5A and 5B context-only indicators)
  const physItems = Object.values(byId).filter(m => m.hazardId !== 'H5');
  const redCount = physItems.filter(m => m.status === 'RED').length;
  const yellowCount = physItems.filter(m => m.status === 'YELLOW').length;

  // 4. Overall Score & Autonomy Penalty
  const hazardMean = hazards.reduce((sum, h) => sum + h.score, 0) / hazards.length;
  const hasRedAlert = redCount > 0 || activeRedFlagSymptoms.length > 0;
  const autonomyPenalty = autonomyLevel === 'A2' && hasRedAlert ? 10 : 0;
  const overall = Math.max(0, Math.min(100, Math.round(hazardMean - autonomyPenalty)));

  // 5. Overall Badge
  let badge = 'NOMINAL';
  if (hasRedAlert || overall <= 49) {
    badge = 'CRITICAL';
  } else if (yellowCount > 0 || overall <= 79) {
    badge = 'WARNING';
  }

  // 6. Anatomical BodyMap Nodes
  const nodes = {
    brain: 'GREEN',
    eyes: 'GREEN',
    heart: 'GREEN',
    lungs: 'GREEN',
    bones: 'GREEN',
    whole: 'GREEN',
  };
  for (const item of physItems) {
    if (item.node && nodes[item.node] !== undefined) {
      nodes[item.node] = worstStatus(nodes[item.node], item.status);
    }
  }

  return {
    cards,
    hazards,
    nodes,
    overall,
    rawAverage: Math.round(hazardMean),
    autonomyPenalty,
    badge,
    redCount,
    yellowCount,
  };
}
