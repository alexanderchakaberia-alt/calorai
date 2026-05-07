import "server-only";

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { requireUserId } from "@/lib/require-auth";
import { isGroqConfigured, groqNotConfiguredResponse } from "@/lib/server-env";

const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export type AnalyzedFoodItem = {
  food_name: string;
  portion_grams: number;
  portion_display: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  confidence: number;
  /** Added server-side when USDA cross-reference was performed. */
  verified?: boolean;
  /** Added when server adjusted to USDA values. */
  verified_adjusted?: boolean;
  /** Optional notes from the model about assumptions. */
  notes?: string;
};

export type AnalyzeFoodApiResponse = {
  items: AnalyzedFoodItem[];
  meal_summary: string;
  cooking_method?: string;
  cuisine_type?: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  overall_confidence?: number;
  hidden_calories_warning?: string;
  photo_quality_note?: string | null;
  partial_parse?: boolean;
  parse_warning?: string | null;
  /**
   * Backwards-compat single-item fields.
   * Some older clients read these directly.
   */
  food_name?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
};

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

function extractJsonObject(text: unknown): unknown {
  const s = String(text ?? "").trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }
  const jsonText = candidate.slice(start, end + 1);
  return JSON.parse(jsonText);
}

/** Attempt to salvage poorly-formatted model JSON (single quotes, trailing commas). */
function tryLenientJsonParse(raw: string): unknown {
  let t = raw.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("invalid");
  t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    t = t.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(t);
    } catch {
      const t2 = t.replace(/'/g, '"');
      return JSON.parse(t2);
    }
  }
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampConf(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function roundToNearest(n: number, step: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / step) * step;
}

function roundCalories5(n: number): number {
  return Math.max(0, roundToNearest(n, 5));
}

function roundMacro05(n: number): number {
  return Math.max(0, roundToNearest(n, 0.5));
}

function normalizeItem(o: Record<string, unknown>, partial: boolean): AnalyzedFoodItem | null {
  const food_name = typeof o.food_name === "string" ? o.food_name.trim() : "";
  if (!food_name) return partial ? null : null;
  const portion_display = typeof o.portion_display === "string" ? o.portion_display.trim() : "estimate";
  const portion_grams = Math.max(1, Math.round(toNum(o.portion_grams, 100)));
  const calories = roundCalories5(Math.max(0, toNum(o.calories, 0)));
  const protein = roundMacro05(Math.max(0, toNum(o.protein, 0)));
  const fat = roundMacro05(Math.max(0, toNum(o.fat, 0)));
  const carbs = roundMacro05(Math.max(0, toNum(o.carbs, 0)));
  const fiber = roundMacro05(Math.max(0, toNum(o.fiber, 0)));
  const confidence = clampConf(Math.round(toNum(o.confidence, partial ? 40 : 70)));
  const notes = typeof o.notes === "string" ? o.notes.trim() : undefined;
  return {
    food_name,
    portion_grams,
    portion_display: portion_display || `${portion_grams} g`,
    calories,
    protein,
    fat,
    carbs,
    fiber,
    confidence,
    ...(notes ? { notes } : {}),
  };
}

function recomputeTotals(items: AnalyzedFoodItem[]) {
  return items.reduce(
    (acc, it) => ({
      total_calories: acc.total_calories + it.calories,
      total_protein: acc.total_protein + it.protein,
      total_fat: acc.total_fat + it.fat,
      total_carbs: acc.total_carbs + it.carbs,
      total_fiber: acc.total_fiber + it.fiber,
    }),
    { total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0, total_fiber: 0 }
  );
}

function parseAnalyzePayload(parsed: unknown): {
  body: AnalyzeFoodApiResponse;
  partial: boolean;
  warning: string | null;
} {
  let partial = false;
  let warning: string | null = null;

  if (!parsed || typeof parsed !== "object") {
    return {
      body: {
        items: [],
        meal_summary: "",
        ...recomputeTotals([]),
        parse_warning: "AI returned an unusable response.",
      },
      partial: true,
      warning: "Partial results — some items may be missing.",
    };
  }

  const o = parsed as Record<string, unknown>;
  const rawItems = o.items;
  const items: AnalyzedFoodItem[] = [];

  if (Array.isArray(rawItems)) {
    for (const el of rawItems) {
      if (el && typeof el === "object") {
        const it = normalizeItem(el as Record<string, unknown>, true);
        if (it) items.push(it);
      }
    }
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    partial = true;
    warning = warning ?? "Partial results — some items may be missing.";
  }

  if (items.length === 0) {
    const meal_summary = typeof o.meal_summary === "string" ? o.meal_summary.trim() : "";
    const note =
      typeof o.photo_quality_note === "string"
        ? o.photo_quality_note.trim()
        : typeof (o as { image_quality?: unknown }).image_quality === "string"
          ? String((o as { image_quality: string }).image_quality).trim()
          : null;

    return {
      body: {
        items: [],
        meal_summary,
        ...recomputeTotals([]),
        photo_quality_note: note,
        partial_parse: true,
        parse_warning:
          "Couldn't identify any food in this image. Try taking a clearer photo with better lighting.",
      },
      partial: true,
      warning: null,
    };
  }

  const meal_summary =
    typeof o.meal_summary === "string" && o.meal_summary.trim()
      ? o.meal_summary.trim()
      : items.map((i) => i.food_name).join(", ");

  const sums = recomputeTotals(items);

  let photo_quality_note: string | null = null;
  if (typeof o.photo_quality_note === "string" && o.photo_quality_note.trim()) {
    photo_quality_note = o.photo_quality_note.trim();
  } else if (typeof (o as { image_quality_warning?: unknown }).image_quality_warning === "string") {
    photo_quality_note = String((o as { image_quality_warning: string }).image_quality_warning).trim();
  }

  const lowConf = items.some((i) => i.confidence < 50);
  if (lowConf) partial = true;

  return {
    body: {
      items,
      meal_summary,
      cooking_method: typeof o.cooking_method === "string" ? o.cooking_method.trim() : undefined,
      cuisine_type: typeof o.cuisine_type === "string" ? o.cuisine_type.trim() : undefined,
      total_calories: Math.round(sums.total_calories),
      total_protein: sums.total_protein,
      total_fat: sums.total_fat,
      total_carbs: sums.total_carbs,
      total_fiber: sums.total_fiber,
      overall_confidence: clampConf(Math.round(toNum(o.overall_confidence, meanConf(items)))),
      hidden_calories_warning:
        typeof o.hidden_calories_warning === "string" ? o.hidden_calories_warning.trim() : undefined,
      photo_quality_note,
      partial_parse: partial,
      parse_warning: warning,
      // Legacy top-level fields: use totals as single-item summary
      food_name: meal_summary,
      calories: Math.round(sums.total_calories),
      protein: sums.total_protein,
      fat: sums.total_fat,
      carbs: sums.total_carbs,
      fiber: sums.total_fiber,
    },
    partial,
    warning,
  };
}

function meanConf(items: AnalyzedFoodItem[]): number {
  if (!items.length) return 0;
  return items.reduce((acc, it) => acc + (Number(it.confidence) || 0), 0) / items.length;
}

function normalizeImageDataUrl(imageBase64: unknown): string {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    throw new Error("Missing imageBase64 in request body.");
  }
  if (imageBase64.startsWith("data:image/")) return imageBase64;
  return `data:image/jpeg;base64,${imageBase64}`;
}

const SYSTEM_PROMPT = `You are an expert nutritionist with 20 years of experience estimating food portions and nutritional content from photos.

ANALYSIS RULES:
1. Identify every distinct food item visible in the image
2. Use visual cues to estimate portions accurately:
   - Compare food to plate size (standard dinner plate = 26cm / 10 inches)
   - Compare food to utensils (standard fork = 19cm / 7.5 inches)
   - Compare food items to each other for relative sizing
   - Look for thickness and depth, not just surface area
3. Account for preparation method (fried adds ~30% calories vs grilled)
4. Include hidden calories: cooking oils, butter, sauces, dressings
5. If you see bread, assume butter unless clearly dry
6. If food looks restaurant-made, portions are typically 30-50% larger than homemade
7. If food looks homemade, use standard home-cooking portions
8. Round calories to nearest 5, macros to nearest 0.5g
9. Be conservative — slightly overestimate rather than underestimate calories
10. Consider the cuisine type for accurate macro splits

PORTION ESTIMATION GUIDE:
- Palm of hand = ~100g meat/fish
- Fist = ~1 cup / ~150g rice or pasta
- Thumb tip = ~1 tablespoon
- Cupped hand = ~30g nuts
- Deck of cards = ~85g meat

COMMON MISTAKES TO AVOID:
- Don't underestimate oil/fat used in cooking
- Don't ignore sauces and dressings (can add 100-200 cal)
- Don't assume lean meat if it looks fatty
- Rice portions are usually larger than people think
- Cheese is calorie-dense (100 cal per 28g slice)

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "food_name": "specific name with preparation method",
      "portion_grams": estimated_weight_in_grams,
      "portion_display": "human readable portion like 1.5 cups or 2 slices",
      "calories": number,
      "protein": number,
      "fat": number,
      "carbs": number,
      "fiber": number,
      "confidence": 0-100,
      "notes": "brief note about assumptions made"
    }
  ],
  "meal_summary": "Brief meal description",
  "cooking_method": "grilled/fried/baked/raw/etc",
  "cuisine_type": "Italian/Georgian/American/etc",
  "total_calories": number,
  "total_protein": number,
  "total_fat": number,
  "total_carbs": number,
  "total_fiber": number,
  "overall_confidence": 0-100,
  "hidden_calories_warning": "any warnings about hidden calories like oil or sauce"
}`;

async function preprocessImageDataUrl(dataUrl: string): Promise<string> {
  // Backend-only preprocessing. If sharp isn't available for some reason, fall back to original.
  try {
    const sharpMod = (await import("sharp")).default;
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!m) return dataUrl;
    const base64 = m[2];
    const input = Buffer.from(base64, "base64");

    const out = await sharpMod(input)
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl;
  }
}

type UsdaNutrientRow = { nutrientId?: number; value?: number };
type UsdaFoodRow = { description?: string; foodNutrients?: UsdaNutrientRow[] };

async function usdaBestMatchPer100g(query: string): Promise<{
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
} | null> {
  const key = process.env.USDA_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 1,
      dataType: ["SR Legacy", "Survey (FNDDS)"],
    }),
  });
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as { foods?: UsdaFoodRow[] } | null;
  const f = json?.foods?.[0];
  if (!f) return null;
  const n = f.foodNutrients ?? [];
  const get = (id: number) => Number(n.find((x) => Number(x.nutrientId) === id)?.value ?? 0) || 0;
  return {
    calories: get(1008),
    protein: get(1003),
    fat: get(1004),
    carbs: get(1005),
    fiber: get(1079),
  };
}

function shouldAdjust(aiPer100: number, usdaPer100: number): boolean {
  if (!Number.isFinite(aiPer100) || !Number.isFinite(usdaPer100) || aiPer100 <= 0 || usdaPer100 <= 0) return false;
  const diff = Math.abs(usdaPer100 - aiPer100) / aiPer100;
  return diff > 0.3;
}

async function verifyWithUsda(items: AnalyzedFoodItem[]): Promise<AnalyzedFoodItem[]> {
  // Limit concurrency to avoid rate limiting.
  const limit = 3;
  const out: AnalyzedFoodItem[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const it = items[idx]!;
      try {
        const grams = Math.max(1, Math.round(Number(it.portion_grams) || 100));
        const aiCalPer100 = (Number(it.calories) || 0) * (100 / grams);
        const usda = await usdaBestMatchPer100g(it.food_name);
        if (!usda) {
          out[idx] = { ...it, verified: false };
          continue;
        }

        const adjust = shouldAdjust(aiCalPer100, usda.calories);
        if (!adjust) {
          out[idx] = { ...it, verified: true, verified_adjusted: false };
          continue;
        }

        const scale = grams / 100;
        out[idx] = {
          ...it,
          calories: roundCalories5(usda.calories * scale),
          protein: roundMacro05(usda.protein * scale),
          fat: roundMacro05(usda.fat * scale),
          carbs: roundMacro05(usda.carbs * scale),
          fiber: roundMacro05(usda.fiber * scale),
          verified: true,
          verified_adjusted: true,
        };
      } catch {
        out[idx] = { ...it, verified: false };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out.filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;

    if (!isGroqConfigured()) return groqNotConfiguredResponse();

    const apiKey = (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY)!.trim();
    const model = (process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL).trim();

    let body: { imageBase64?: unknown };
    try {
      body = (await req.json()) as { imageBase64?: unknown };
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    const rawDataUrl = normalizeImageDataUrl(body?.imageBase64);
    const dataUrl = await preprocessImageDataUrl(rawDataUrl);

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this food photo and return ONLY the JSON object." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = extractJsonObject(content);
    } catch {
      try {
        parsed = tryLenientJsonParse(content);
      } catch {
        return NextResponse.json<AnalyzeFoodApiResponse>({
          items: [],
          meal_summary: "",
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          total_fiber: 0,
          partial_parse: true,
          parse_warning: "Partial results — some items may be missing.",
          photo_quality_note: null,
        });
      }
    }

    const { body: result0, partial, warning } = parseAnalyzePayload(parsed);
    const verifiedItems = await verifyWithUsda(result0.items);
    const sums = recomputeTotals(verifiedItems);
    const result: AnalyzeFoodApiResponse = {
      ...result0,
      items: verifiedItems,
      total_calories: Math.round(sums.total_calories),
      total_protein: sums.total_protein,
      total_fat: sums.total_fat,
      total_carbs: sums.total_carbs,
      total_fiber: sums.total_fiber,
      calories: Math.round(sums.total_calories),
      protein: sums.total_protein,
      fat: sums.total_fat,
      carbs: sums.total_carbs,
      fiber: sums.total_fiber,
    };
    if (warning) result.parse_warning = warning;
    if (partial) result.partial_parse = true;

    return NextResponse.json<AnalyzeFoodApiResponse>(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[analyze-food]", err);

    if (err instanceof Error) {
      const m = err.message.toLowerCase();
      if (m.includes("401") || m.includes("invalid api key") || m.includes("api key")) {
        return jsonError(
          "Groq rejected the API key. Set GROQ_API_KEY in Vercel (server) and redeploy.",
          502,
          "GROQ_AUTH"
        );
      }
    }

    return apiErrorFromUnknown(err, "Failed to analyze food image.");
  }
}
