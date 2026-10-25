/**
 * Carbon estimation utility.
 *
 * Formula:
 *   carbon_stored_tC = alive_trees × per_tree_carbon(species, age_years)
 *   CO2e = carbon_stored_tC × 3.67
 *
 * Carbon factors are stored per species in Firestore as:
 *   species/{id}.carbonFactors = { "1": 0.005, "2": 0.012, ... }
 *   (age in years -> tonnes C per tree)
 *
 * IMPORTANT: All carbon factors are PLACEHOLDER values.
 * TODO: Replace with published species-specific allometric data.
 * Do NOT present these numbers as scientifically validated.
 *
 * We return a low-high range:
 *   low  = value × 0.7  (30% below estimate)
 *   high = value × 1.3  (30% above estimate)
 */

const CO2_CONVERSION = 3.67; // tonnes CO2 per tonne C
const RANGE_FACTOR = 0.3;     // ±30% range

/**
 * Calculates estimated carbon stored and CO2e for a plot.
 *
 * @param {number} aliveTrees - Number of surviving trees.
 * @param {object} carbonFactors - Map of age (string years) to tC per tree.
 * @param {number} ageYears - Age of the plot in years (fractional ok, will round down).
 * @returns {{ carbonLow: number, carbonHigh: number, co2eLow: number, co2eHigh: number }}
 */
export function estimateCarbon(aliveTrees, carbonFactors, ageYears) {
  if (!Number.isFinite(Number(aliveTrees)) || Number(aliveTrees) <= 0 || !carbonFactors || ageYears < 0) {
    return { carbonLow: 0, carbonHigh: 0, co2eLow: 0, co2eHigh: 0 };
  }

  // Use the floor of age, minimum 1 year
  const ageKey = String(Math.max(1, Math.floor(ageYears)));

  // Find the carbon factor for this age, or the closest lower age
  let factor = Number(carbonFactors[ageKey]);
  if (factor === undefined) {
    // Find closest lower age
    const ages = Object.keys(carbonFactors).map(Number).sort((a, b) => a - b);
    const ageNum = Math.floor(ageYears);
    const closestAge = ages.filter(a => a <= ageNum).pop() || ages[0];
    factor = Number(carbonFactors[String(closestAge)]) || 0;
  }

  const carbonMid = aliveTrees * factor;
  const carbonLow = carbonMid * (1 - RANGE_FACTOR);
  const carbonHigh = carbonMid * (1 + RANGE_FACTOR);

  return {
    carbonLow: Math.round(carbonLow * 10000) / 10000,
    carbonHigh: Math.round(carbonHigh * 10000) / 10000,
    co2eLow: Math.round(carbonLow * CO2_CONVERSION * 10000) / 10000,
    co2eHigh: Math.round(carbonHigh * CO2_CONVERSION * 10000) / 10000,
  };
}

/**
 * Calculate age in years from a planting date to now.
 */
export function getAgeYears(plantedAt) {
  if (!plantedAt) return 0;
  const planted = plantedAt.toDate ? plantedAt.toDate() : new Date(plantedAt);
  const now = new Date();
  return (now - planted) / (1000 * 60 * 60 * 24 * 365.25);
}
