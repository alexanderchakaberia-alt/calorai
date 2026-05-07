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
};

export type AnalyzeFoodApiResponse = {
  items: AnalyzedFoodItem[];
  meal_summary: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  photo_quality_note?: string | null;
  partial_parse?: boolean;
  parse_warning?: string | null;
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

function normalizeItem(o: Record<string, unknown>, partial: boolean): AnalyzedFoodItem | null {
  const food_name = typeof o.food_name === "string" ? o.food_name.trim() : "";
  if (!food_name) return partial ? null : null;
  const portion_display = typeof o.portion_display === "string" ? o.portion_display.trim() : "estimate";
  const portion_grams = Math.max(1, Math.round(toNum(o.portion_grams, 100)));
  const calories = Math.max(0, toNum(o.calories, 0));
  const protein = Math.max(0, toNum(o.protein, 0));
  const fat = Math.max(0, toNum(o.fat, 0));
  const carbs = Math.max(0, toNum(o.carbs, 0));
  const fiber = Math.max(0, toNum(o.fiber, 0));
  const confidence = clampConf(Math.round(toNum(o.confidence, partial ? 40 : 70)));
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
      total_calories: Math.round(sums.total_calories),
      total_protein: sums.total_protein,
      total_fat: sums.total_fat,
      total_carbs: sums.total_carbs,
      total_fiber: sums.total_fiber,
      photo_quality_note,
      partial_parse: partial,
      parse_warning: warning,
    },
    partial,
    warning,
  };
}

function normalizeImageDataUrl(imageBase64: unknown): string {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    throw new Error("Missing imageBase64 in request body.");
  }
  if (imageBase64.startsWith("data:image/")) return imageBase64;
  return `data:image/jpeg;base64,${imageBase64}`;
}

const SYSTEM_PROMPT = `You are a professional nutritionist AI. Analyze this food image carefully.

Rules:
- Identify EVERY distinct food item visible (main dish, sides, sauces, drinks, condiments)
- For each item, estimate portion size in grams AND in everyday units (e.g. "1 cup", "2 slices")
- Provide accurate calorie and macro estimates based on USDA nutritional data
- Give a confidence score 0-100 for each item
- If you see a plate with mixed food, break it into individual components
- Don't miss small items like oil/butter used in cooking, sauces, dressings, or drinks
- If unsure about an ingredient, include it with lower confidence
- If the image is too dark, blurry, or the food is not visible, set "photo_quality_note" to a short explanation and still return best-effort items (or an empty items array if impossible)

Return ONLY valid JSON with double-quoted keys and string values. No markdown outside JSON.
Schema:
{
  "items": [
    {
      "food_name": "Grilled Chicken Breast",
      "portion_grams": 150,
      "portion_display": "1 medium breast",
      "calories": 250,
      "protein": 46,
      "fat": 5,
      "carbs": 0,
      "fiber": 0,
      "confidence": 92
    }
  ],
  "meal_summary": "Grilled chicken with rice and vegetables",
  "total_calories": 650,
  "total_protein": 52,
  "total_fat": 12,
  "total_carbs": 78,
  "total_fiber": 6,
  "photo_quality_note": null
}`;

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

    const dataUrl = normalizeImageDataUrl(body?.imageBase64);

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

    const { body: result, partial, warning } = parseAnalyzePayload(parsed);
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
