import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import type { ApiErrorResponse, GetDailyHistoryResponse, ISODateString } from "@/lib/types";
import { getPastDaysDailyRollups } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

function isISODate(s: string): s is ISODateString {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const daysRaw = searchParams.get("days");
    let days = 7;
    if (daysRaw) {
      const n = Number(daysRaw);
      if (!Number.isFinite(n) || n < 1 || n > 31) return jsonError("Invalid query param days (expected 1–31).", 400);
      days = Math.floor(n);
    }

    let todayUtc: ISODateString | undefined;
    const todayParam = searchParams.get("today");
    if (todayParam) {
      if (!isISODate(todayParam)) return jsonError("Invalid query param today (expected YYYY-MM-DD).", 400);
      todayUtc = todayParam;
    }

    const { today, rollups } = await getPastDaysDailyRollups(userId, { pastDayCount: days, todayUtc });
    const body: GetDailyHistoryResponse = { today, rollups };
    return NextResponse.json(body);
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to load history.");
  }
}
