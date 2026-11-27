import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client/web';
import { removeAvatarIfLocal } from './uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
let currentDbPath = null;
let tursoInitPromise = null;
let envLoaded = false;

function loadDotEnvOnce() {
  if (envLoaded || process.env.VITEST || process.env.NODE_ENV === 'test') return;
  envLoaded = true;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore .env read errors
  }
}

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (length(trim(username)) >= 3),
    CHECK (length(trim(display_name)) >= 1)
  );

  CREATE TABLE IF NOT EXISTS rpg_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    system TEXT NOT NULL DEFAULT 'Medieval Fantasy',
    era_label TEXT NOT NULL DEFAULT 'Primeira Era das Crônicas',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hiatus', 'completed')),
    owner_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (length(trim(name)) >= 1)
  );

  CREATE TABLE IF NOT EXISTS table_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'chronicler', 'co-gm')),
    joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (table_id) REFERENCES rpg_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (table_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    avatar_url TEXT DEFAULT NULL,
    biography TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    race TEXT NOT NULL DEFAULT '',
    character_class TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (table_id) REFERENCES rpg_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (length(trim(name)) >= 1),
    CHECK (length(trim(race)) >= 1),
    CHECK (length(trim(character_class)) >= 1),
    CHECK (length(trim(gender)) >= 1)
  );

  CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    session_label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (length(trim(title)) >= 1),
    CHECK (length(trim(content)) >= 1)
  );

  CREATE INDEX IF NOT EXISTS idx_rpg_tables_owner ON rpg_tables(owner_id);
  CREATE INDEX IF NOT EXISTS idx_table_members_table ON table_members(table_id);
  CREATE INDEX IF NOT EXISTS idx_table_members_user ON table_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_characters_table ON characters(table_id);
  CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
  CREATE INDEX IF NOT EXISTS idx_diary_entries_character ON diary_entries(character_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_diary_entries_author ON diary_entries(author_id);

  DROP TRIGGER IF EXISTS trg_characters_validate_table_access_insert;
  DROP TRIGGER IF EXISTS trg_characters_validate_table_access_update;
  DROP TRIGGER IF EXISTS trg_diary_validate_authorization_insert;
  DROP TRIGGER IF EXISTS trg_diary_validate_authorization_update;
  DROP TRIGGER IF EXISTS trg_characters_preserve_ownership_update;

  CREATE TRIGGER trg_characters_preserve_ownership_update
  BEFORE UPDATE OF user_id ON characters
  FOR EACH ROW
  WHEN NEW.user_id != OLD.user_id
  BEGIN
    SELECT RAISE(ABORT, 'Character ownership cannot be transferred or modified');
  END;

  CREATE TRIGGER trg_diary_validate_authorization_insert
  BEFORE INSERT ON diary_entries
  FOR EACH ROW
  BEGIN
    SELECT CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM characters c
        WHERE c.id = NEW.character_id
          AND c.user_id = NEW.author_id
      )
      THEN RAISE(ABORT, 'Diary entry author must be authorized as the owner of the character')
    END;
  END;

  CREATE TRIGGER trg_diary_validate_authorization_update
  BEFORE UPDATE OF character_id, author_id ON diary_entries
  FOR EACH ROW
  WHEN NEW.author_id != OLD.author_id OR NEW.character_id != OLD.character_id
  BEGIN
    SELECT RAISE(ABORT, 'Diary entry ownership and character association cannot be modified');
  END;
`;

/**
 * Adapter that wraps @libsql/client (Turso Cloud SQLite) with the same
 * db.prepare(sql).get/all/run(...) and db.exec(sql) interface used across the server.
 */
export class TursoDatabaseAdapter {
  constructor(client) {
    this.client = client;
    this.isTurso = true;
  }

  prepare(sql) {
    const client = this.client;
    const normalizeArgs = (args) =>
      args.map((a) => (a === undefined ? null : a));

    return {
      async get(...args) {
        const rs = await client.execute({
          sql,
          args: normalizeArgs(args)
        });
        if (!rs.rows || rs.rows.length === 0) return undefined;
        return { ...rs.rows[0] };
      },
      async all(...args) {
        const rs = await client.execute({
          sql,
          args: normalizeArgs(args)
        });
        return (rs.rows || []).map((r) => ({ ...r }));
      },
      async run(...args) {
        const rs = await client.execute({
          sql,
          args: normalizeArgs(args)
        });
        return {
          changes: Number(rs.rowsAffected || 0),
          lastInsertRowid:
            rs.lastInsertRowid !== undefined && rs.lastInsertRowid !== null
              ? Number(rs.lastInsertRowid)
              : 0
        };
      }
    };
  }

  async exec(sql) {
    await this.client.executeMultiple(sql);
  }

  close() {
    try {
      this.client.close();
    } catch {
      // Ignore close errors
    }
  }
}

export function getTursoConfig() {
  loadDotEnvOnce();
  const rawUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    process.env.DB_URL ||
    process.env.DATABASE_URL ||
    '';
  const rawToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.DB_TOKEN ||
    '';
  return {
    url: rawUrl.trim(),
    authToken: rawToken.trim() || undefined
  };
}

export function isTursoEnabled(customPath = null) {
  if (customPath) return false;
  const { url } = getTursoConfig();
  return Boolean(url);
}

export function getDefaultDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'rpg-diaries-data')
    : path.resolve(__dirname, '..', 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {
    // Ignore read-only filesystem errors on serverless environments
  }
  return path.join(dataDir, 'rpg_diaries.sqlite');
}

export function initDb(customPath = null) {
  if (isTursoEnabled(customPath)) {
    const { url: tursoUrl, authToken } = getTursoConfig();
    if (dbInstance && dbInstance.isTurso && currentDbPath === tursoUrl) {
      return dbInstance;
    }

    const client = createClient({
      url: tursoUrl,
      authToken
    });

    dbInstance = new TursoDatabaseAdapter(client);
    currentDbPath = tursoUrl;
    tursoInitPromise = null;
    return dbInstance;
  }

  const targetPath = customPath || getDefaultDbPath();
  if (dbInstance && !dbInstance.isTurso && currentDbPath === targetPath && targetPath !== ':memory:') {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
  }

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqliteModule = process.getBuiltinModule
    ? process.getBuiltinModule('node:sqlite')
    : null;
  if (!sqliteModule || !sqliteModule.DatabaseSync) {
    throw new Error(
      'O módulo nativo node:sqlite requer Node.js 22.5+ para banco local, ou defina TURSO_DATABASE_URL para conectar ao Turso.'
    );
  }

  const db = new sqliteModule.DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  createSchema(db);
  purgeDemoData(db);

  dbInstance = db;
  currentDbPath = targetPath;
  tursoInitPromise = Promise.resolve(db);
  return db;
}

export function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

/**
 * Ensures database schema is initialized.
 * - For local SQLite, initDb() already creates the schema synchronously.
 * - For Turso Cloud (libSQL), runs schema creation & foreign_keys pragma once per cold start.
 */
export async function ensureDbReady() {
  const db = getDb();
  if (!db.isTurso) {
    return db;
  }
  if (!tursoInitPromise) {
    tursoInitPromise = (async () => {
      await db.exec('PRAGMA foreign_keys = ON;\n' + SCHEMA_SQL);
      return db;
    })().catch((err) => {
      tursoInitPromise = null;
      throw err;
    });
  }
  return tursoInitPromise;
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
    dbInstance = null;
    currentDbPath = null;
    tursoInitPromise = null;
  }
}

export function createSchema(db) {
  return db.exec(SCHEMA_SQL);
}

/**
 * Purges any legacy seeded demo accounts, demo tables, demo characters,
 * demo character avatar files, and demo diary entries while preserving all real user data.
 */
export function purgeDemoData(db) {
  if (db.isTurso) {
    return { purgedUsers: 0, purgedCharacters: 0 };
  }

  const demoUsers = db
    .prepare(
      `SELECT id FROM users
       WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
          OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')`
    )
    .all();

  const demoUserIds = demoUsers.map((u) => Number(u.id));

  const demoChars = db
    .prepare(
      `SELECT id, avatar_url FROM characters
       WHERE user_id IN (
         SELECT id FROM users
         WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
            OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')
       )
       OR table_id IN (
         SELECT id FROM rpg_tables
         WHERE owner_id IN (
           SELECT id FROM users
           WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
              OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')
         )
         OR name IN (
           'The Ashen Crown of Valdoria',
           'A Coroa de Cinzas de Valdoria',
           'Voyage of the Starlight Brigantine',
           'Viagem do Brigantine Luz Estelar'
         )
       )
       OR name IN (
         'Seraphina Vale',
         'Thorne Ironbrow',
         'Vaelen Whisperwind',
         'Captain Cassian Vane',
         'Capitão Cassian Vane'
       )`
    )
    .all();

  if (demoUserIds.length === 0 && demoChars.length === 0) {
    return { purgedUsers: 0, purgedCharacters: 0 };
  }

  for (const ch of demoChars) {
    if (ch.avatar_url) {
      removeAvatarIfLocal(ch.avatar_url);
    }
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `DELETE FROM diary_entries
       WHERE author_id IN (
         SELECT id FROM users
         WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
            OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')
       )
       OR character_id IN (
         SELECT id FROM characters
         WHERE name IN (
           'Seraphina Vale',
           'Thorne Ironbrow',
           'Vaelen Whisperwind',
           'Captain Cassian Vane',
           'Capitão Cassian Vane'
         )
       )`
    ).run();

    db.prepare(
      `DELETE FROM characters
       WHERE user_id IN (
         SELECT id FROM users
         WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
            OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')
       )
       OR name IN (
         'Seraphina Vale',
         'Thorne Ironbrow',
         'Vaelen Whisperwind',
         'Captain Cassian Vane',
         'Capitão Cassian Vane'
       )`
    ).run();

    db.prepare(
      `DELETE FROM rpg_tables
       WHERE owner_id IN (
         SELECT id FROM users
         WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
            OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')
       )
       OR name IN (
         'The Ashen Crown of Valdoria',
         'A Coroa de Cinzas de Valdoria',
         'Voyage of the Starlight Brigantine',
         'Viagem do Brigantine Luz Estelar'
       )`
    ).run();

    const userDel = db
      .prepare(
        `DELETE FROM users
         WHERE lower(email) IN ('aldric@archive.rpg', 'elena@archive.rpg', 'kaelen@archive.rpg')
            OR (lower(username) IN ('aldric', 'elena', 'kaelen') AND lower(email) LIKE '%@archive.rpg')`
      )
      .run();

    db.exec('COMMIT');
    return {
      purgedUsers: Number(userDel.changes || 0),
      purgedCharacters: demoChars.length
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
