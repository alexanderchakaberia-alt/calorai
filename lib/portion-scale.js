/**
 * Scale nutrition when portion (grams) changes — keeps ratios from baseline AI estimate.
 * @param {number} baseGrams
 * @param {number} newGrams
 * @param {{ calories: number; protein: number; fat: number; carbs: number; fiber?: number }} macros
 */
export function scaleMacrosFromGrams(baseGrams, newGrams, macros) {
  const g0 = Number(baseGrams);
  const g1 = Number(newGrams);
  if (!Number.isFinite(g0) || !Number.isFinite(g1) || g0 <= 0) {
    return {
      calories: Math.round(macros.calories || 0),
      protein: round1(macros.protein),
      fat: round1(macros.fat),
      carbs: round1(macros.carbs),
      fiber: round1(macros.fiber ?? 0),
    };
  }
  const r = g1 / g0;
  return {
    calories: Math.round((macros.calories || 0) * r),
    protein: round1((macros.protein || 0) * r),
    fat: round1((macros.fat || 0) * r),
    carbs: round1((macros.carbs || 0) * r),
    fiber: round1((macros.fiber ?? 0) * r),
  };
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}
