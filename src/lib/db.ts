/**
 * Persistence.
 *
 * `node:sqlite` ships with Node 22+, so the product has zero database
 * dependencies: no native build, no ORM, no migration tool. A file next to the
 * app is the whole database.
 *
 * Reports are stored as JSON blobs keyed by scan id. That is deliberate: a
 * report is a document, not a normalized model, and it must survive a schema
 * change of the engine without a migration.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ScanResult } from './types';

const DB_PATH = process.env.PREFLIGHT_DB ?? join(process.cwd(), 'data', 'preflight.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      score INTEGER NOT NULL,
      grade TEXT NOT NULL,
      blocking INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS scans_created ON scans (created_at DESC);
    CREATE TABLE IF NOT EXISTS usage (
      key TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (key, day)
    );
    CREATE TABLE IF NOT EXISTS licenses (
      code TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      scans_used INTEGER NOT NULL DEFAULT 0,
      scans_limit INTEGER NOT NULL
    );
  `);
  return db;
}

export function saveScan(result: ScanResult): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO scans (id, url, created_at, score, grade, blocking, duration_ms, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      result.id,
      result.url,
      result.scannedAt,
      result.score.value,
      result.score.grade,
      result.score.blocking,
      result.durationMs,
      JSON.stringify(result),
    );
}

export function getScan(id: string): ScanResult | null {
  const row = getDb().prepare('SELECT payload FROM scans WHERE id = ?').get(id) as
    | { payload: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as ScanResult;
  } catch {
    return null;
  }
}

export interface ScanSummary {
  id: string;
  url: string;
  scannedAt: string;
  score: number;
  grade: string;
  blocking: number;
}

/** Recent public scans. Used by the landing page as social proof, opt-out via env. */
export function recentScans(limit = 8): ScanSummary[] {
  if (process.env.PREFLIGHT_HIDE_RECENT === '1') return [];
  const rows = getDb()
    .prepare(
      `SELECT id, url, created_at, score, grade, blocking FROM scans ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as { id: string; url: string; created_at: string; score: number; grade: string; blocking: number }[];

  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    scannedAt: r.created_at,
    score: r.score,
    grade: r.grade,
    blocking: r.blocking,
  }));
}

export function countScans(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM scans').get() as { n: number };
  return row.n;
}
