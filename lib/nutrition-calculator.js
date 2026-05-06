/**
 * Evidence-based daily energy and macro estimates (Mifflin–St Jeor / Katch-McArdle, activity multipliers).
 * For educational use — not a substitute for medical or dietetic advice.
 */

/** @type {Record<string, number>} */
export const ACTIVITY_MULTIPLIERS = Object.freeze({
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
});

/** @type {Record<string, { tdeeFactor: number; proteinPerKg: number }>} */
export const GOAL_PRESETS = Object.freeze({
  cut: { tdeeFactor: 0.8, proteinPerKg: 2.2 },
  maintain: { tdeeFactor: 1.0, proteinPerKg: 1.6 },
  lean_bulk: { tdeeFactor: 1.1, proteinPerKg: 1.8 },
  bulk: { tdeeFactor: 1.2, proteinPerKg: 1.8 },
});

export function lbsToKg(lbs) {
  return lbs / 2.205;
}

export function kgToLbs(kg) {
  return kg * 2.205;
}

export function inchesHeightToCm(feet, inches) {
  const totalIn = Number(feet) * 12 + Number(inches);
  return totalIn * 2.54;
}

export function cmToFeetInches(cm) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { feet: ft, inches: inch };
}

/**
 * Mifflin–St Jeor BMR (kcal/day)
 * Male: 10w + 6.25h - 5a + 5
 * Female: 10w + 6.25h - 5a - 161
 */
export function bmrMifflinStJeor({ sex, weightKg, heightCm, ageYears }) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(ageYears);
  if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(a)) return NaN;
  const base = 10 * w + 6.25 * h - 5 * a;
  if (sex === "male") return base + 5;
  return base - 161;
}

/**
 * Katch–McArdle: BMR = 370 + 21.6 × LBM (kg)
 */
export function bmrKatchMcArdle({ weightKg, bodyFatPercent }) {
  const w = Number(weightKg);
  const bf = Number(bodyFatPercent);
  if (!Number.isFinite(w) || !Number.isFinite(bf) || bf < 0 || bf >= 100) return NaN;
  const lbm = w * (1 - bf / 100);
  return 370 + 21.6 * lbm;
}

export function tdeeFromBmr(bmr, activityKey) {
  const m = ACTIVITY_MULTIPLIERS[activityKey];
  if (!Number.isFinite(bmr) || m === undefined) return NaN;
  return bmr * m;
}

export function targetCaloriesFromTdee(tdee, goalKey) {
  const p = GOAL_PRESETS[goalKey];
  if (!Number.isFinite(tdee) || !p) return NaN;
  return tdee * p.tdeeFactor;
}

export function fiberGramsRecommendation(targetCalories, sex) {
  const fromCal = Math.round((14 * targetCalories) / 1000);
  if (sex === "female") return Math.min(35, Math.max(25, fromCal));
  if (sex === "male") return Math.min(38, Math.max(25, fromCal));
  return Math.min(38, Math.max(25, fromCal));
}

/**
 * Returns macro grams and calorie split; fat fixed at 25% of total kcal; protein by g/kg; carbs = remainder.
 */
export function macroTargetsFromCalories({ targetCalories, weightKg, goalKey, sex }) {
  const preset = GOAL_PRESETS[goalKey];
  const cal = Number(targetCalories);
  const w = Number(weightKg);
  if (!Number.isFinite(cal) || cal <= 0 || !Number.isFinite(w) || w <= 0 || !preset) {
    return {
      proteinG: NaN,
      fatG: NaN,
      carbsG: NaN,
      fiberG: NaN,
      proteinCal: NaN,
      fatCal: NaN,
      carbsCal: NaN,
      proteinPct: NaN,
      fatPct: NaN,
      carbsPct: NaN,
    };
  }

  const proteinG = Math.round(w * preset.proteinPerKg * 10) / 10;
  const proteinCal = proteinG * 4;

  const fatCal = cal * 0.25;
  const fatG = Math.round((fatCal / 9) * 10) / 10;

  const carbsCal = Math.max(0, cal - proteinCal - fatCal);
  const carbsG = Math.round((carbsCal / 4) * 10) / 10;

  const fiberG = fiberGramsRecommendation(cal, sex === "male" || sex === "female" ? sex : "male");

  const proteinPct = cal > 0 ? Math.round((proteinCal / cal) * 1000) / 10 : 0;
  const fatPct = cal > 0 ? Math.round((fatCal / cal) * 1000) / 10 : 0;
  const carbsPct = cal > 0 ? Math.round((carbsCal / cal) * 1000) / 10 : 0;

  return {
    proteinG,
    fatG,
    carbsG,
    fiberG,
    proteinCal,
    fatCal,
    carbsCal,
    proteinPct,
    fatPct,
    carbsPct,
  };
}

/**
 * Full pipeline: inputs → BMR, TDEE, target kcal, macros.
 * @param {object} input
 */
export function computeSmartGoals(input) {
  const {
    sex,
    ageYears,
    weightKg,
    heightCm,
    activityKey,
    goalKey,
    bodyFatPercent,
  } = input;

  const bf = bodyFatPercent != null && Number(bodyFatPercent) > 0 ? Number(bodyFatPercent) : null;

  let bmr;
  if (bf !== null && bf >= 5 && bf <= 50) {
    bmr = bmrKatchMcArdle({ weightKg, bodyFatPercent: bf });
  } else {
    bmr = bmrMifflinStJeor({ sex, weightKg, heightCm, ageYears });
  }

  const tdee = tdeeFromBmr(bmr, activityKey);
  const targetCalories = Math.round(targetCaloriesFromTdee(tdee, goalKey));

  const macros = macroTargetsFromCalories({
    targetCalories,
    weightKg,
    goalKey,
    sex,
  });

  return {
    bmr: Math.round(bmr * 10) / 10,
    tdee: Math.round(tdee * 10) / 10,
    targetCalories,
    ...macros,
  };
}
