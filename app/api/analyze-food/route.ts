import "server-only";

import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type AnalyzeFoodResult = {
  food_name: string;
  portion: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function extractJsonObject(text: unknown): unknown {
  const s = String(text ?? "").trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI did not return valid JSON.");
  }
  const jsonText = candidate.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function normalizeImageDataUrl(imageBase64: unknown): string {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    throw new Error("Missing imageBase64 in request body.");
  }
  if (imageBase64.startsWith("data:image/")) return imageBase64;
  return `data:image/jpeg;base64,${imageBase64}`;
}

function validateResult(x: unknown): AnalyzeFoodResult {
  if (!x || typeof x !== "object") throw new Error("AI did not return valid JSON.");
  const o = x as Record<string, unknown>;
  const food_name = typeof o.food_name === "string" ? o.food_name.trim() : "";
  const portion = typeof o.portion === "string" ? o.portion.trim() : "";
  const calories = Number(o.calories);
  const protein = Number(o.protein);
  const fat = Number(o.fat);
  const carbs = Number(o.carbs);

  if (!food_name) throw new Error("AI response missing food_name.");
  if (!portion) throw new Error("AI response missing portion.");
  for (const [k, v] of [
    ["calories", calories],
    ["protein", protein],
    ["fat", fat],
    ["carbs", carbs],
  ] as const) {
    if (!Number.isFinite(v)) throw new Error(`AI response missing numeric ${k}.`);
  }

  return { food_name, portion, calories, protein, fat, carbs };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      return jsonError("Missing Groq API key in environment variables.", 500);
    }

    const body = (await req.json().catch(() => null)) as { imageBase64?: unknown } | null;
    const dataUrl = normalizeImageDataUrl(body?.imageBase64);

    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL;

    const systemPrompt = [
      "You are a nutrition assistant.",
      "Identify the food in the image and estimate portion size.",
      "Return ONLY valid JSON with these exact fields:",
      "food_name (string), portion (string), calories (number), protein (number), fat (number), carbs (number).",
      "No extra keys, no markdown, no commentary.",
    ].join("\n");

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this food photo and return the JSON now." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content);
    const result = validateResult(parsed);
    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze food image.";
    return jsonError(message, 500);
  }
}

