import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
let currentDbPath = null;

export function getDefaultDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'rpg_diaries.sqlite');
}

export function initDb(customPath = null) {
  const targetPath = customPath || getDefaultDbPath();
  if (dbInstance && currentDbPath === targetPath && targetPath !== ':memory:') {
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

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  createSchema(db);

  dbInstance = db;
  currentDbPath = targetPath;
  return db;
}

export function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
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
  }
}

export function createSchema(db) {
  db.exec(`
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
      era_label TEXT NOT NULL DEFAULT 'First Age of Chronicles',
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

    -- Enforce at DB level that a character's owner must be the table owner or a member of that table
    CREATE TRIGGER IF NOT EXISTS trg_characters_validate_table_access_insert
    BEFORE INSERT ON characters
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM rpg_tables t
          WHERE t.id = NEW.table_id
            AND (
              t.owner_id = NEW.user_id
              OR EXISTS (
                SELECT 1 FROM table_members tm
                WHERE tm.table_id = NEW.table_id AND tm.user_id = NEW.user_id
              )
            )
        )
        THEN RAISE(ABORT, 'Character owner must be the table owner or a registered member of the RPG table')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_characters_validate_table_access_update
    BEFORE UPDATE OF table_id, user_id ON characters
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM rpg_tables t
          WHERE t.id = NEW.table_id
            AND (
              t.owner_id = NEW.user_id
              OR EXISTS (
                SELECT 1 FROM table_members tm
                WHERE tm.table_id = NEW.table_id AND tm.user_id = NEW.user_id
              )
            )
        )
        THEN RAISE(ABORT, 'Character owner must be the table owner or a registered member of the RPG table')
      END;
    END;

    -- Enforce at DB level that a diary entry's author has access to the character's table and is authorized for the character
    CREATE TRIGGER IF NOT EXISTS trg_diary_validate_authorization_insert
    BEFORE INSERT ON diary_entries
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM characters c
          JOIN rpg_tables t ON t.id = c.table_id
          WHERE c.id = NEW.character_id
            AND (c.user_id = NEW.author_id OR t.owner_id = NEW.author_id)
            AND (
              t.owner_id = NEW.author_id
              OR EXISTS (
                SELECT 1 FROM table_members tm
                WHERE tm.table_id = t.id AND tm.user_id = NEW.author_id
              )
            )
        )
        THEN RAISE(ABORT, 'Diary entry author must be authorized for the character and its RPG table')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_diary_validate_authorization_update
    BEFORE UPDATE OF character_id, author_id ON diary_entries
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM characters c
          JOIN rpg_tables t ON t.id = c.table_id
          WHERE c.id = NEW.character_id
            AND (c.user_id = NEW.author_id OR t.owner_id = NEW.author_id)
            AND (
              t.owner_id = NEW.author_id
              OR EXISTS (
                SELECT 1 FROM table_members tm
                WHERE tm.table_id = t.id AND tm.user_id = NEW.author_id
              )
            )
        )
        THEN RAISE(ABORT, 'Diary entry author must be authorized for the character and its RPG table')
      END;
    END;
  `);
}
