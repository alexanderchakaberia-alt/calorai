import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import type { ApiErrorResponse, FoodSearchResponse, FoodSearchResult, FoodSearchSource } from "@/lib/types";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

const USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

const USDA_NUTRIENTS = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
} as const;

type UsdaFood = {
  description?: string;
  lowercaseDescription?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{ nutrientId?: number; value?: number }>;
};

async function searchUsda(query: string): Promise<FoodSearchResult[]> {
  const key = process.env.USDA_API_KEY?.trim();
  if (!key) return [];

  const url = new URL(USDA_URL);
  url.searchParams.set("api_key", key);

  const body = {
    query,
    pageSize: 20,
    dataType: ["SR Legacy", "Survey (FNDDS)"],
  };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    // cache: "no-store"  // default for dynamic routes
  });

  if (!res.ok) {
    // Rate limiting / quota: return empty, let caller provide warning
    return [];
  }

  const json = (await res.json().catch(() => null)) as { foods?: UsdaFood[] } | null;
  const foods = json?.foods ?? [];

  const out: FoodSearchResult[] = [];
  for (const f of foods) {
    const name = (f.description || f.lowercaseDescription || "").trim();
    if (!name) continue;

    const nutrients = f.foodNutrients ?? [];
    const get = (id: number) =>
      nutrients.find((n) => Number(n.nutrientId) === id)?.value ?? 0;

    const serving_size = Number.isFinite(Number(f.servingSize)) && Number(f.servingSize) > 0 ? Number(f.servingSize) : 100;
    const serving_unit = (f.servingSizeUnit || "g").toString();

    out.push({
      name,
      source: "usda",
      serving_size,
      serving_unit,
      calories: Number(get(USDA_NUTRIENTS.calories)) || 0,
      protein: Number(get(USDA_NUTRIENTS.protein)) || 0,
      fat: Number(get(USDA_NUTRIENTS.fat)) || 0,
      carbs: Number(get(USDA_NUTRIENTS.carbs)) || 0,
      fiber: Number(get(USDA_NUTRIENTS.fiber)) || 0,
    });
  }

  return out;
}

type OffSearchProduct = {
  product_name?: string;
  brands?: string;
  code?: string;
  nutriments?: Record<string, unknown>;
};

function offNum(n: unknown): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return [];

  const json = (await res.json().catch(() => null)) as { products?: OffSearchProduct[] } | null;
  const products = json?.products ?? [];

  const out: FoodSearchResult[] = [];
  for (const p of products) {
    const rawName = (p.product_name || "").trim();
    if (!rawName) continue;
    const name = p.brands ? `${rawName} (${p.brands})` : rawName;

    const n = p.nutriments ?? {};
    // OFF is usually per 100g
    out.push({
      name,
      source: "openfoodfacts",
      serving_size: 100,
      serving_unit: "g",
      calories: offNum(n["energy-kcal_100g"]),
      protein: offNum(n["proteins_100g"]),
      fat: offNum(n["fat_100g"]),
      carbs: offNum(n["carbohydrates_100g"]),
      fiber: offNum(n["fiber_100g"]),
      ...(p.code ? { barcode: String(p.code) } : {}),
    });
  }
  return out;
}

async function lookupOpenFoodFactsBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { product?: OffSearchProduct } | null;
  const p = json?.product;
  if (!p) return null;
  const rawName = (p.product_name || "").trim();
  if (!rawName) return null;
  const name = p.brands ? `${rawName} (${p.brands})` : rawName;
  const n = p.nutriments ?? {};
  return {
    name,
    source: "openfoodfacts",
    serving_size: 100,
    serving_unit: "g",
    calories: offNum(n["energy-kcal_100g"]),
    protein: offNum(n["proteins_100g"]),
    fat: offNum(n["fat_100g"]),
    carbs: offNum(n["carbohydrates_100g"]),
    fiber: offNum(n["fiber_100g"]),
    barcode,
  };
}

function parseSource(x: string | null): FoodSearchSource | "all" {
  if (!x) return "all";
  const s = x.toLowerCase();
  if (s === "usda" || s === "openfoodfacts") return s;
  if (s === "all") return "all";
  return "all";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") || "").trim();
    const barcode = (url.searchParams.get("barcode") || "").trim();
    const source = parseSource(url.searchParams.get("source"));

    if (!query && !barcode) return jsonError("Missing query.", 400, "BAD_REQUEST");

    // Barcode lookup is Open Food Facts only.
    if (barcode) {
      const item = await lookupOpenFoodFactsBarcode(barcode);
      return NextResponse.json<FoodSearchResponse>({ foods: item ? [item] : [] });
    }

    const jobs: Array<Promise<FoodSearchResult[]>> = [];
    const warnings: string[] = [];

    if (source === "usda") jobs.push(searchUsda(query));
    else if (source === "openfoodfacts") jobs.push(searchOpenFoodFacts(query));
    else {
      jobs.push(
        searchUsda(query).catch(() => {
          warnings.push("USDA search failed.");
          return [];
        })
      );
      jobs.push(
        searchOpenFoodFacts(query).catch(() => {
          warnings.push("Open Food Facts search failed.");
          return [];
        })
      );
    }

    const results = (await Promise.all(jobs)).flat();
    return NextResponse.json<FoodSearchResponse>({ foods: results, ...(warnings.length ? { warning: warnings.join(" ") } : {}) });
  } catch (err) {
    return apiErrorFromUnknown(err, "Food search failed.");
  }
}

