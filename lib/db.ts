import "server-only";

import Database from "better-sqlite3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DailyGoals, ISODateString, MacroTotals, MealEntry } from "./types";

type DbMealRow = MealEntry;
type DbGoalsRow = DailyGoals;

type SqlValue = string | number | null;

const DEFAULTS = Object.freeze({
  calorie_goal: 2000,
  protein_goal: 150,
  fat_goal: 65,
  carbs_goal: 225,
});

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getDbFilePath(): string {
  return path.join(process.cwd(), "db.sqlite");
}

function openDb(): Database.Database {
  const dbPath = getDbFilePath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var __calorai_db__: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __calorai_db_inited__: boolean | undefined;
}

function getDb(): Database.Database {
  if (!globalThis.__calorai_db__) {
    globalThis.__calorai_db__ = openDb();
  }
  if (!globalThis.__calorai_db_inited__) {
    initDb(globalThis.__calorai_db__);
    globalThis.__calorai_db_inited__ = true;
  }
  return globalThis.__calorai_db__;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS daily_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      calorie_goal INTEGER NOT NULL DEFAULT ${DEFAULTS.calorie_goal},
      protein_goal INTEGER NOT NULL DEFAULT ${DEFAULTS.protein_goal},
      fat_goal INTEGER NOT NULL DEFAULT ${DEFAULTS.fat_goal},
      carbs_goal INTEGER NOT NULL DEFAULT ${DEFAULTS.carbs_goal},
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      fat REAL NOT NULL,
      carbs REAL NOT NULL,
      portion_size TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_goals_user_date ON daily_goals(user_id, date);
  `);
}

export function ensureUser(userId: string) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO users (id, created_at)
     VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`
  );
  stmt.run(userId, nowIso());
}

export function getDailyGoals(userId: string, date: ISODateString): DailyGoals {
  const db = getDb();
  ensureUser(userId);

  const insert = db.prepare(
    `INSERT INTO daily_goals (
      id, user_id, date,
      calorie_goal, protein_goal, fat_goal, carbs_goal,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO NOTHING`
  );
  insert.run(
    randomUUID(),
    userId,
    date,
    DEFAULTS.calorie_goal,
    DEFAULTS.protein_goal,
    DEFAULTS.fat_goal,
    DEFAULTS.carbs_goal,
    nowIso()
  );

  const row = db
    .prepare<SqlValue[], DbGoalsRow>(
      `SELECT id, user_id, date, calorie_goal, protein_goal, fat_goal, carbs_goal, created_at
       FROM daily_goals
       WHERE user_id = ? AND date = ?
       LIMIT 1`
    )
    .get(userId, date);

  if (!row) {
    throw new Error("Failed to load daily goals.");
  }

  return {
    ...row,
    calorie_goal: toNumber(row.calorie_goal),
    protein_goal: toNumber(row.protein_goal),
    fat_goal: toNumber(row.fat_goal),
    carbs_goal: toNumber(row.carbs_goal),
  };
}

export function upsertDailyGoals(
  userId: string,
  date: ISODateString,
  goals: Partial<Pick<DailyGoals, "calorie_goal" | "protein_goal" | "fat_goal" | "carbs_goal">>
): DailyGoals {
  const db = getDb();
  ensureUser(userId);

  const existing = getDailyGoals(userId, date);

  const next = {
    calorie_goal:
      goals.calorie_goal !== undefined ? Math.max(0, Math.floor(goals.calorie_goal)) : existing.calorie_goal,
    protein_goal:
      goals.protein_goal !== undefined ? Math.max(0, Math.floor(goals.protein_goal)) : existing.protein_goal,
    fat_goal: goals.fat_goal !== undefined ? Math.max(0, Math.floor(goals.fat_goal)) : existing.fat_goal,
    carbs_goal: goals.carbs_goal !== undefined ? Math.max(0, Math.floor(goals.carbs_goal)) : existing.carbs_goal,
  };

  db.prepare(
    `INSERT INTO daily_goals (
      id, user_id, date, calorie_goal, protein_goal, fat_goal, carbs_goal, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      calorie_goal = excluded.calorie_goal,
      protein_goal = excluded.protein_goal,
      fat_goal = excluded.fat_goal,
      carbs_goal = excluded.carbs_goal`
  ).run(randomUUID(), userId, date, next.calorie_goal, next.protein_goal, next.fat_goal, next.carbs_goal, nowIso());

  return getDailyGoals(userId, date);
}

export function addMealEntry(
  userId: string,
  date: ISODateString,
  meal: Pick<MealEntry, "meal_name" | "calories" | "protein" | "fat" | "carbs" | "portion_size">
): MealEntry {
  const db = getDb();
  ensureUser(userId);
  getDailyGoals(userId, date); // ensures goals exist for the date

  const id = randomUUID();
  const created_at = nowIso();
  const portion_size = meal.portion_size?.trim() ? meal.portion_size.trim() : null;

  db.prepare(
    `INSERT INTO meal_entries (
      id, user_id, date, meal_name, calories, protein, fat, carbs, portion_size, image_path, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    date,
    meal.meal_name.trim(),
    Math.max(0, Math.floor(meal.calories)),
    Math.max(0, toNumber(meal.protein)),
    Math.max(0, toNumber(meal.fat)),
    Math.max(0, toNumber(meal.carbs)),
    portion_size,
    null,
    created_at
  );

  const row = db
    .prepare<SqlValue[], DbMealRow>(
      `SELECT id, user_id, date, meal_name, calories, protein, fat, carbs, portion_size, image_path, created_at
       FROM meal_entries WHERE id = ? LIMIT 1`
    )
    .get(id);

  if (!row) throw new Error("Failed to load created meal entry.");
  return {
    ...row,
    calories: toNumber(row.calories),
    protein: toNumber(row.protein),
    fat: toNumber(row.fat),
    carbs: toNumber(row.carbs),
  };
}

export function getMealsForDate(userId: string, date: ISODateString): MealEntry[] {
  const db = getDb();
  ensureUser(userId);
  getDailyGoals(userId, date);

  const rows = db
    .prepare<SqlValue[], DbMealRow>(
      `SELECT id, user_id, date, meal_name, calories, protein, fat, carbs, portion_size, image_path, created_at
       FROM meal_entries
       WHERE user_id = ? AND date = ?
       ORDER BY datetime(created_at) DESC`
    )
    .all(userId, date);

  return rows.map((r) => ({
    ...r,
    calories: toNumber(r.calories),
    protein: toNumber(r.protein),
    fat: toNumber(r.fat),
    carbs: toNumber(r.carbs),
  }));
}

export function getDailyTotals(userId: string, date: ISODateString): MacroTotals {
  const db = getDb();
  ensureUser(userId);
  getDailyGoals(userId, date);

  const row = db
    .prepare<
      SqlValue[],
      { calories: number | null; protein: number | null; fat: number | null; carbs: number | null }
    >(
      `SELECT
        SUM(calories) AS calories,
        SUM(protein) AS protein,
        SUM(fat) AS fat,
        SUM(carbs) AS carbs
       FROM meal_entries
       WHERE user_id = ? AND date = ?`
    )
    .get(userId, date);

  return {
    calories: toNumber(row?.calories),
    protein: toNumber(row?.protein),
    fat: toNumber(row?.fat),
    carbs: toNumber(row?.carbs),
  };
}

export function deleteMealEntry(mealId: string, userId?: string): { deleted: boolean } {
  const db = getDb();
  const stmt = userId
    ? db.prepare(`DELETE FROM meal_entries WHERE id = ? AND user_id = ?`)
    : db.prepare(`DELETE FROM meal_entries WHERE id = ?`);
  const res = userId ? stmt.run(mealId, userId) : stmt.run(mealId);
  return { deleted: res.changes > 0 };
}

