import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  sanitizeUser,
  requireAuth,
  getTableAccess
} from './auth.js';
import {
  getUploadDir,
  singleAvatarUpload,
  saveVerifiedAvatar,
  removeAvatarIfLocal
} from './uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatCharacter(row, currentUserId = null) {
  if (!row) return null;
  const isCharacterOwner = currentUserId != null && Number(row.user_id) === Number(currentUserId);
  const isTableOwner = currentUserId != null && Number(row.table_owner_id) === Number(currentUserId);
  return {
    id: row.id,
    table_id: row.table_id,
    table_name: row.table_name || undefined,
    table_system: row.table_system || undefined,
    table_owner_id: row.table_owner_id || undefined,
    user_id: row.user_id,
    owner_name: row.owner_name || undefined,
    owner_username: row.owner_username || undefined,
    name: row.name,
    title: row.title || '',
    avatar_url: row.avatar_url || null,
    biography: row.biography || '',
    gender: row.gender,
    race: row.race,
    class: row.character_class,
    character_class: row.character_class,
    entry_count: row.entry_count != null ? Number(row.entry_count) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_owner: isCharacterOwner,
    can_edit: isCharacterOwner || isTableOwner,
    can_write_diary: isCharacterOwner || isTableOwner
  };
}

function formatDiaryEntry(row, currentUserId = null) {
  if (!row) return null;
  const isAuthor = currentUserId != null && Number(row.author_id) === Number(currentUserId);
  const isCharOwner = currentUserId != null && Number(row.character_owner_id) === Number(currentUserId);
  const isTableOwner = currentUserId != null && Number(row.table_owner_id) === Number(currentUserId);
  return {
    id: row.id,
    character_id: row.character_id,
    character_name: row.character_name,
    character_title: row.character_title || '',
    character_avatar: row.character_avatar || null,
    character_race: row.character_race || '',
    character_class: row.character_class || '',
    table_id: row.table_id,
    table_name: row.table_name,
    author_id: row.author_id,
    author_name: row.author_name,
    author_username: row.author_username,
    title: row.title,
    content: row.content,
    session_label: row.session_label || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    can_edit: isAuthor || isCharOwner || isTableOwner
  };
}

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded character avatars persistently
  app.use('/uploads/avatars', (req, res, next) => {
    express.static(getUploadDir())(req, res, next);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rpg-diaries-archive' });
  });

  // =========================================================================
  // 1. AUTHENTICATION & ACCOUNT ROUTES
  // =========================================================================
  app.post('/api/auth/register', (req, res) => {
    const db = getDb();
    const { username, email, display_name, password, bio } = req.body || {};

    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanDisplayName = String(display_name || cleanUsername || '').trim();
    const rawPassword = String(password || '');
    const cleanBio = String(bio || '').trim();

    if (cleanUsername.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters and contain only letters, numbers, dots, hyphens, or underscores.'
      });
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display name is required.' });
    }
    if (rawPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db
      .prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?')
      .get(cleanUsername, cleanEmail);

    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
        return res.status(409).json({ error: 'That username is already inscribed in the Archive.' });
      }
      return res.status(409).json({ error: 'That email address is already registered.' });
    }

    const passwordHash = hashPassword(rawPassword);
    const result = db
      .prepare(
        `INSERT INTO users (username, email, display_name, password_hash, bio)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(cleanUsername, cleanEmail, cleanDisplayName, passwordHash, cleanBio);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(newUser);

    res.cookie('rpg_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser)
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { username, password } = req.body || {};
    const identifier = String(username || '').trim();
    const rawPassword = String(password || '');

    if (!identifier || !rawPassword) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(identifier, identifier);

    if (!user || !verifyPassword(rawPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials. No matching scribe found in the Archive.' });
    }

    const token = signToken(user);
    res.cookie('rpg_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      token,
      user: sanitizeUser(user)
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('rpg_token');
    return res.json({ message: 'Signed out from the Archive.' });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    return res.json({ user: req.user });
  });

  app.put('/api/auth/account', requireAuth, (req, res) => {
    const db = getDb();
    const { display_name, email, bio, current_password, new_password } = req.body || {};
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const nextDisplayName = display_name !== undefined ? String(display_name).trim() : userRow.display_name;
    const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : userRow.email;
    const nextBio = bio !== undefined ? String(bio).trim() : userRow.bio;

    if (!nextDisplayName) {
      return res.status(400).json({ error: 'Display name cannot be empty.' });
    }
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const emailConflict = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(nextEmail, req.user.id);
    if (emailConflict) {
      return res.status(409).json({ error: 'That email address is already used by another account.' });
    }

    let nextPasswordHash = userRow.password_hash;
    if (new_password) {
      if (!current_password || !verifyPassword(String(current_password), userRow.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (String(new_password).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      nextPasswordHash = hashPassword(String(new_password));
    }

    db.prepare(
      `UPDATE users
       SET display_name = ?, email = ?, bio = ?, password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`
    ).run(nextDisplayName, nextEmail, nextBio, nextPasswordHash, req.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user: sanitizeUser(updated) });
  });

  // Search registered users to add to a table
  app.get('/api/users/search', requireAuth, (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim();
    const rows = db
      .prepare(
        `SELECT id, username, display_name, bio, avatar_url
         FROM users
         WHERE (? = '' OR username LIKE ? OR display_name LIKE ?)
         ORDER BY display_name ASC
         LIMIT 25`
      )
      .all(q, `%${q}%`, `%${q}%`);
    return res.json({ users: rows });
  });

  // =========================================================================
  // 2. DASHBOARD SUMMARY ROUTE
  // =========================================================================
  app.get('/api/dashboard', requireAuth, (req, res) => {
    const db = getDb();
    const userId = req.user.id;

    const tables = db
      .prepare(
        `SELECT
           t.*,
           u.display_name AS owner_name,
           u.username AS owner_username,
           tm.role AS member_role,
           (SELECT COUNT(*) FROM table_members m WHERE m.table_id = t.id) + 1 AS member_count,
           (SELECT COUNT(*) FROM characters c WHERE c.table_id = t.id) AS character_count,
           (SELECT COUNT(*) FROM diary_entries d JOIN characters c ON c.id = d.character_id WHERE c.table_id = t.id) AS entry_count
         FROM rpg_tables t
         JOIN users u ON u.id = t.owner_id
         LEFT JOIN table_members tm ON tm.table_id = t.id AND tm.user_id = ?
         WHERE t.owner_id = ? OR tm.user_id IS NOT NULL
         ORDER BY t.updated_at DESC, t.id DESC`
      )
      .all(userId, userId)
      .map((row) => ({
        ...row,
        is_owner: Number(row.owner_id) === Number(userId),
        my_role: Number(row.owner_id) === Number(userId) ? 'owner' : row.member_role
      }));

    const ownedTables = tables.filter((t) => t.is_owner);
    const participatingTables = tables.filter((t) => !t.is_owner);

    const characters = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE t.owner_id = ?
            OR EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = t.id AND tm.user_id = ?)
         ORDER BY c.updated_at DESC, c.id DESC`
      )
      .all(userId, userId)
      .map((row) => formatCharacter(row, userId));

    const myCharacters = characters.filter((c) => c.is_owner);

    const recentEntries = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE t.owner_id = ?
            OR EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = t.id AND tm.user_id = ?)
         ORDER BY d.created_at DESC, d.id DESC
         LIMIT 12`
      )
      .all(userId, userId)
      .map((row) => formatDiaryEntry(row, userId));

    return res.json({
      stats: {
        total_tables: tables.length,
        owned_tables_count: ownedTables.length,
        participating_tables_count: participatingTables.length,
        total_characters: characters.length,
        my_characters_count: myCharacters.length,
        total_entries: tables.reduce((acc, t) => acc + Number(t.entry_count || 0), 0)
      },
      owned_tables: ownedTables,
      participating_tables: participatingTables,
      tables,
      my_characters: myCharacters,
      characters,
      recent_entries: recentEntries
    });
  });

  // =========================================================================
  // 3. RPG TABLES & MEMBERSHIP MANAGEMENT ROUTES
  // =========================================================================
  app.get('/api/tables', requireAuth, (req, res) => {
    const db = getDb();
    const userId = req.user.id;

    const tables = db
      .prepare(
        `SELECT
           t.*,
           u.display_name AS owner_name,
           u.username AS owner_username,
           tm.role AS member_role,
           (SELECT COUNT(*) FROM table_members m WHERE m.table_id = t.id) + 1 AS member_count,
           (SELECT COUNT(*) FROM characters c WHERE c.table_id = t.id) AS character_count,
           (SELECT COUNT(*) FROM diary_entries d JOIN characters c ON c.id = d.character_id WHERE c.table_id = t.id) AS entry_count
         FROM rpg_tables t
         JOIN users u ON u.id = t.owner_id
         LEFT JOIN table_members tm ON tm.table_id = t.id AND tm.user_id = ?
         WHERE t.owner_id = ? OR tm.user_id IS NOT NULL
         ORDER BY t.updated_at DESC, t.id DESC`
      )
      .all(userId, userId)
      .map((row) => ({
        ...row,
        is_owner: Number(row.owner_id) === Number(userId),
        my_role: Number(row.owner_id) === Number(userId) ? 'owner' : row.member_role
      }));

    return res.json({ tables });
  });

  app.post('/api/tables', requireAuth, (req, res) => {
    const db = getDb();
    const { name, description, system, era_label, status } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanDesc = String(description || '').trim();
    const cleanSystem = String(system || 'Medieval Fantasy').trim() || 'Medieval Fantasy';
    const cleanEra = String(era_label || 'First Age of Chronicles').trim() || 'First Age of Chronicles';
    const cleanStatus = ['active', 'hiatus', 'completed'].includes(status) ? status : 'active';

    if (!cleanName) {
      return res.status(400).json({ error: 'Table name is required.' });
    }

    const result = db
      .prepare(
        `INSERT INTO rpg_tables (name, description, system, era_label, status, owner_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(cleanName, cleanDesc, cleanSystem, cleanEra, cleanStatus, req.user.id);

    const created = db
      .prepare(
        `SELECT t.*, u.display_name AS owner_name, u.username AS owner_username
         FROM rpg_tables t
         JOIN users u ON u.id = t.owner_id
         WHERE t.id = ?`
      )
      .get(result.lastInsertRowid);

    return res.status(201).json({
      table: {
        ...created,
        is_owner: true,
        my_role: 'owner',
        member_count: 1,
        character_count: 0,
        entry_count: 0
      }
    });
  });

  app.get('/api/tables/:id', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const { table, isOwner, membership, hasAccess } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found in the Archive.' });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this RPG table.' });
    }

    const ownerUser = db
      .prepare('SELECT id, username, display_name, email, bio, avatar_url FROM users WHERE id = ?')
      .get(table.owner_id);

    const members = db
      .prepare(
        `SELECT
           tm.id AS membership_id,
           tm.table_id,
           tm.user_id,
           tm.role,
           tm.joined_at,
           u.username,
           u.display_name,
           u.email,
           u.bio,
           u.avatar_url
         FROM table_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.table_id = ?
         ORDER BY tm.joined_at ASC`
      )
      .all(tableId);

    const characters = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE c.table_id = ?
         ORDER BY c.name ASC`
      )
      .all(tableId)
      .map((row) => formatCharacter(row, req.user.id));

    const chronicles = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE c.table_id = ?
         ORDER BY d.created_at DESC, d.id DESC`
      )
      .all(tableId)
      .map((row) => formatDiaryEntry(row, req.user.id));

    return res.json({
      table: {
        ...table,
        is_owner: isOwner,
        my_role: isOwner ? 'owner' : membership.role,
        member_count: members.length + 1,
        character_count: characters.length,
        entry_count: chronicles.length
      },
      owner: ownerUser,
      members,
      characters,
      chronicles
    });
  });

  app.put('/api/tables/:id', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const { table, isOwner } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the table owner may modify table settings.' });
    }

    const { name, description, system, era_label, status } = req.body || {};
    const nextName = name !== undefined ? String(name).trim() : table.name;
    const nextDesc = description !== undefined ? String(description).trim() : table.description;
    const nextSystem = system !== undefined ? String(system).trim() || 'Medieval Fantasy' : table.system;
    const nextEra = era_label !== undefined ? String(era_label).trim() || 'First Age of Chronicles' : table.era_label;
    const nextStatus = ['active', 'hiatus', 'completed'].includes(status) ? status : table.status;

    if (!nextName) {
      return res.status(400).json({ error: 'Table name cannot be empty.' });
    }

    db.prepare(
      `UPDATE rpg_tables
       SET name = ?, description = ?, system = ?, era_label = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`
    ).run(nextName, nextDesc, nextSystem, nextEra, nextStatus, tableId);

    const updated = db
      .prepare(
        `SELECT t.*, u.display_name AS owner_name, u.username AS owner_username
         FROM rpg_tables t
         JOIN users u ON u.id = t.owner_id
         WHERE t.id = ?`
      )
      .get(tableId);

    return res.json({
      table: {
        ...updated,
        is_owner: true,
        my_role: 'owner'
      }
    });
  });

  app.delete('/api/tables/:id', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const { table, isOwner } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the table owner can dissolve this RPG table.' });
    }

    // Clean up local avatar files for characters in this table
    const chars = db.prepare('SELECT avatar_url FROM characters WHERE table_id = ?').all(tableId);
    for (const c of chars) {
      removeAvatarIfLocal(c.avatar_url);
    }

    db.prepare('DELETE FROM rpg_tables WHERE id = ?').run(tableId);
    return res.json({ message: 'RPG table and its chronicles have been removed.' });
  });

  // Table Membership Management
  app.get('/api/tables/:id/members', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const { table, hasAccess } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this table.' });
    }

    const owner = db
      .prepare('SELECT id, username, display_name, email, bio, avatar_url FROM users WHERE id = ?')
      .get(table.owner_id);

    const members = db
      .prepare(
        `SELECT
           tm.id AS membership_id,
           tm.table_id,
           tm.user_id,
           tm.role,
           tm.joined_at,
           u.username,
           u.display_name,
           u.email,
           u.bio,
           u.avatar_url
         FROM table_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.table_id = ?
         ORDER BY tm.joined_at ASC`
      )
      .all(tableId);

    return res.json({ owner, members });
  });

  app.post('/api/tables/:id/members', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const { table, isOwner } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the table owner may manage campaign membership.' });
    }

    const { username, user_id, role } = req.body || {};
    const validRole = ['player', 'chronicler', 'co-gm'].includes(role) ? role : 'player';

    let targetUser = null;
    if (user_id) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(user_id));
    } else if (username) {
      const ident = String(username).trim();
      targetUser = db
        .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
        .get(ident, ident);
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in the Archive. Check the username or email.' });
    }

    if (Number(targetUser.id) === Number(table.owner_id)) {
      return res.status(400).json({ error: 'The table owner is already the sovereign master of this table.' });
    }

    const existing = db
      .prepare('SELECT id FROM table_members WHERE table_id = ? AND user_id = ?')
      .get(tableId, targetUser.id);
    if (existing) {
      return res.status(409).json({ error: 'This user is already a member of the table.' });
    }

    db.prepare('INSERT INTO table_members (table_id, user_id, role) VALUES (?, ?, ?)').run(
      tableId,
      targetUser.id,
      validRole
    );

    const memberRecord = db
      .prepare(
        `SELECT
           tm.id AS membership_id,
           tm.table_id,
           tm.user_id,
           tm.role,
           tm.joined_at,
           u.username,
           u.display_name,
           u.email,
           u.bio,
           u.avatar_url
         FROM table_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.table_id = ? AND tm.user_id = ?`
      )
      .get(tableId, targetUser.id);

    return res.status(201).json({ member: memberRecord });
  });

  app.put('/api/tables/:id/members/:userId', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const { table, isOwner } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the table owner may update member roles.' });
    }

    const { role } = req.body || {};
    if (!['player', 'chronicler', 'co-gm'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const result = db
      .prepare('UPDATE table_members SET role = ? WHERE table_id = ? AND user_id = ?')
      .run(role, tableId, targetUserId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found in this table.' });
    }

    const memberRecord = db
      .prepare(
        `SELECT
           tm.id AS membership_id,
           tm.table_id,
           tm.user_id,
           tm.role,
           tm.joined_at,
           u.username,
           u.display_name,
           u.email,
           u.bio,
           u.avatar_url
         FROM table_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.table_id = ? AND tm.user_id = ?`
      )
      .get(tableId, targetUserId);

    return res.json({ member: memberRecord });
  });

  app.delete('/api/tables/:id/members/:userId', requireAuth, (req, res) => {
    const db = getDb();
    const tableId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const { table, isOwner } = getTableAccess(db, tableId, req.user.id);

    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    const isSelfLeave = Number(req.user.id) === targetUserId && !isOwner;
    if (!isOwner && !isSelfLeave) {
      return res.status(403).json({ error: 'Only the table owner can remove members from this table.' });
    }

    const result = db
      .prepare('DELETE FROM table_members WHERE table_id = ? AND user_id = ?')
      .run(tableId, targetUserId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found in this table.' });
    }

    return res.json({ message: 'Member removed from the table.' });
  });

  // =========================================================================
  // 4. CHARACTERS & CHARACTER PROFILE ROUTES
  // =========================================================================
  app.get('/api/characters', requireAuth, (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { table_id, mine, q } = req.query;

    if (table_id) {
      const access = getTableAccess(db, Number(table_id), userId);
      if (!access.table) {
        return res.status(404).json({ error: 'RPG table not found.' });
      }
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'You are not authorized to access characters from this table.' });
      }
    }

    const search = String(q || '').trim();
    const onlyMine = mine === 'true' || mine === '1';

    const rows = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE (
           t.owner_id = ?
           OR EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = t.id AND tm.user_id = ?)
         )
         AND (? IS NULL OR c.table_id = ?)
         AND (? = 0 OR c.user_id = ?)
         AND (
           ? = ''
           OR c.name LIKE ?
           OR c.race LIKE ?
           OR c.character_class LIKE ?
           OR c.biography LIKE ?
         )
         ORDER BY c.updated_at DESC, c.id DESC`
      )
      .all(
        userId,
        userId,
        table_id ? Number(table_id) : null,
        table_id ? Number(table_id) : null,
        onlyMine ? 1 : 0,
        userId,
        search,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );

    return res.json({
      characters: rows.map((r) => formatCharacter(r, userId))
    });
  });

  app.post('/api/characters', requireAuth, singleAvatarUpload('avatar'), (req, res) => {
    const db = getDb();
    const body = req.body || {};
    const tableId = Number(body.table_id);

    if (!tableId || Number.isNaN(tableId)) {
      return res.status(400).json({ error: 'A valid RPG table (table_id) is required to create a character.' });
    }

    const { table, hasAccess } = getTableAccess(db, tableId, req.user.id);
    if (!table) {
      return res.status(404).json({ error: 'RPG table not found.' });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'You cannot create a character in an RPG table you do not belong to.' });
    }

    const cleanName = String(body.name || '').trim();
    const cleanTitle = String(body.title || '').trim();
    const cleanBio = String(body.biography || '').trim();
    const cleanGender = String(body.gender || '').trim();
    const cleanRace = String(body.race || '').trim();
    const cleanClass = String(body.class ?? body.character_class ?? '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Character name is required.' });
    }
    if (!cleanRace) {
      return res.status(400).json({ error: 'Character race is required.' });
    }
    if (!cleanClass) {
      return res.status(400).json({ error: 'Character class is required.' });
    }
    if (!cleanGender) {
      return res.status(400).json({ error: 'Character gender is required.' });
    }

    let avatarUrl = null;
    if (req.file && req.file.buffer) {
      try {
        avatarUrl = saveVerifiedAvatar(req.file.buffer, 'char');
      } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }
    }

    const result = db
      .prepare(
        `INSERT INTO characters (table_id, user_id, name, title, avatar_url, biography, gender, race, character_class)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        tableId,
        req.user.id,
        cleanName,
        cleanTitle,
        avatarUrl,
        cleanBio,
        cleanGender,
        cleanRace,
        cleanClass
      );

    db.prepare(`UPDATE rpg_tables SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`).run(tableId);

    const created = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           0 AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`
      )
      .get(result.lastInsertRowid);

    return res.status(201).json({
      character: formatCharacter(created, req.user.id)
    });
  });

  app.get('/api/characters/:id', requireAuth, (req, res) => {
    const db = getDb();
    const charId = Number(req.params.id);

    const row = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.era_label AS table_era,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`
      )
      .get(charId);

    if (!row) {
      return res.status(404).json({ error: 'Character dossier not found in the Archive.' });
    }

    const { hasAccess } = getTableAccess(db, row.table_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this character profile.' });
    }

    const diaryEntries = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE d.character_id = ?
         ORDER BY d.created_at DESC, d.id DESC`
      )
      .all(charId)
      .map((entry) => formatDiaryEntry(entry, req.user.id));

    const companions = db
      .prepare(
        `SELECT id, name, title, avatar_url, race, character_class AS class, user_id
         FROM characters
         WHERE table_id = ? AND id != ?
         ORDER BY name ASC`
      )
      .all(row.table_id, charId);

    return res.json({
      character: {
        ...formatCharacter(row, req.user.id),
        table_era: row.table_era
      },
      diary_entries: diaryEntries,
      companions
    });
  });

  app.put('/api/characters/:id', requireAuth, (req, res) => {
    const db = getDb();
    const charId = Number(req.params.id);

    const existing = db
      .prepare(
        `SELECT c.*, t.owner_id AS table_owner_id
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         WHERE c.id = ?`
      )
      .get(charId);

    if (!existing) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this character’s RPG table.' });
    }

    const isCharOwner = Number(existing.user_id) === Number(req.user.id);
    if (!isCharOwner && !isTableOwner) {
      return res.status(403).json({
        error: 'Only the character owner or table administrator may edit this character profile.'
      });
    }

    const body = req.body || {};
    const nextName = body.name !== undefined ? String(body.name).trim() : existing.name;
    const nextTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
    const nextBio = body.biography !== undefined ? String(body.biography).trim() : existing.biography;
    const nextGender = body.gender !== undefined ? String(body.gender).trim() : existing.gender;
    const nextRace = body.race !== undefined ? String(body.race).trim() : existing.race;
    const rawClass = body.class !== undefined ? body.class : body.character_class;
    const nextClass = rawClass !== undefined ? String(rawClass).trim() : existing.character_class;

    if (!nextName || !nextGender || !nextRace || !nextClass) {
      return res.status(400).json({
        error: 'Character name, gender, race, and class cannot be empty.'
      });
    }

    db.prepare(
      `UPDATE characters
       SET name = ?, title = ?, biography = ?, gender = ?, race = ?, character_class = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`
    ).run(nextName, nextTitle, nextBio, nextGender, nextRace, nextClass, charId);

    const updated = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`
      )
      .get(charId);

    return res.json({
      character: formatCharacter(updated, req.user.id)
    });
  });

  // Upload or replace character profile picture
  app.post('/api/characters/:id/avatar', requireAuth, singleAvatarUpload('avatar'), (req, res) => {
    const db = getDb();
    const charId = Number(req.params.id);

    const existing = db
      .prepare(
        `SELECT c.*, t.owner_id AS table_owner_id
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         WHERE c.id = ?`
      )
      .get(charId);

    if (!existing) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    const isCharOwner = Number(existing.user_id) === Number(req.user.id);

    if (!hasAccess || (!isCharOwner && !isTableOwner)) {
      return res.status(403).json({
        error: 'Only the character owner or table administrator can change the character portrait.'
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    let avatarUrl;
    try {
      avatarUrl = saveVerifiedAvatar(req.file.buffer, `char-${charId}`);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }

    if (existing.avatar_url) {
      removeAvatarIfLocal(existing.avatar_url);
    }

    db.prepare(
      `UPDATE characters
       SET avatar_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`
    ).run(avatarUrl, charId);

    const updated = db
      .prepare(
        `SELECT
           c.*,
           t.name AS table_name,
           t.system AS table_system,
           t.owner_id AS table_owner_id,
           u.display_name AS owner_name,
           u.username AS owner_username,
           (SELECT COUNT(*) FROM diary_entries d WHERE d.character_id = c.id) AS entry_count
         FROM characters c
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`
      )
      .get(charId);

    return res.json({
      character: formatCharacter(updated, req.user.id)
    });
  });

  app.delete('/api/characters/:id/avatar', requireAuth, (req, res) => {
    const db = getDb();
    const charId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
    if (!existing) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    const isCharOwner = Number(existing.user_id) === Number(req.user.id);
    if (!hasAccess || (!isCharOwner && !isTableOwner)) {
      return res.status(403).json({ error: 'Not authorized to modify this character portrait.' });
    }

    if (existing.avatar_url) {
      removeAvatarIfLocal(existing.avatar_url);
    }

    db.prepare(
      `UPDATE characters SET avatar_url = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
    ).run(charId);

    return res.json({ message: 'Character portrait reset to default archive crest.' });
  });

  app.delete('/api/characters/:id', requireAuth, (req, res) => {
    const db = getDb();
    const charId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
    if (!existing) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    const isCharOwner = Number(existing.user_id) === Number(req.user.id);

    if (!hasAccess || (!isCharOwner && !isTableOwner)) {
      return res.status(403).json({
        error: 'Only the character owner or table administrator may delete this character.'
      });
    }

    if (existing.avatar_url) {
      removeAvatarIfLocal(existing.avatar_url);
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(charId);
    return res.json({ message: 'Character and associated diary entries have been removed.' });
  });

  // =========================================================================
  // 5. DIARY ENTRIES (CHRONICLES) ROUTES
  // =========================================================================
  app.get('/api/diaries', requireAuth, (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { table_id, character_id, q } = req.query;

    if (table_id) {
      const access = getTableAccess(db, Number(table_id), userId);
      if (!access.table) {
        return res.status(404).json({ error: 'RPG table not found.' });
      }
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this RPG table.' });
      }
    }

    if (character_id) {
      const charRow = db.prepare('SELECT id, table_id FROM characters WHERE id = ?').get(Number(character_id));
      if (!charRow) {
        return res.status(404).json({ error: 'Character not found.' });
      }
      const access = getTableAccess(db, charRow.table_id, userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this character’s chronicles.' });
      }
    }

    const search = String(q || '').trim();
    const rows = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE (
           t.owner_id = ?
           OR EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = t.id AND tm.user_id = ?)
         )
         AND (? IS NULL OR t.id = ?)
         AND (? IS NULL OR c.id = ?)
         AND (
           ? = ''
           OR d.title LIKE ?
           OR d.content LIKE ?
           OR d.session_label LIKE ?
           OR c.name LIKE ?
         )
         ORDER BY d.created_at DESC, d.id DESC`
      )
      .all(
        userId,
        userId,
        table_id ? Number(table_id) : null,
        table_id ? Number(table_id) : null,
        character_id ? Number(character_id) : null,
        character_id ? Number(character_id) : null,
        search,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );

    return res.json({
      entries: rows.map((r) => formatDiaryEntry(r, userId))
    });
  });

  app.get('/api/diaries/:id', requireAuth, (req, res) => {
    const db = getDb();
    const entryId = Number(req.params.id);

    const row = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE d.id = ?`
      )
      .get(entryId);

    if (!row) {
      return res.status(404).json({ error: 'Diary entry not found in the Archive.' });
    }

    const { hasAccess } = getTableAccess(db, row.table_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You are not authorized to read this diary entry.' });
    }

    return res.json({
      entry: formatDiaryEntry(row, req.user.id)
    });
  });

  app.post('/api/diaries', requireAuth, (req, res) => {
    const db = getDb();
    const { character_id, title, content, session_label } = req.body || {};

    if (!character_id || Number.isNaN(Number(character_id))) {
      return res.status(400).json({
        error: 'Every diary entry must be associated with an existing character (character_id is required).'
      });
    }

    const charId = Number(character_id);
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
    if (!character) {
      return res.status(404).json({ error: 'Selected character does not exist.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, character.table_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not belong to the RPG table of this character.'
      });
    }

    const isCharOwner = Number(character.user_id) === Number(req.user.id);
    if (!isCharOwner && !isTableOwner) {
      return res.status(403).json({
        error: 'You can only write diary entries for your own characters (or as the table owner).'
      });
    }

    const cleanTitle = String(title || '').trim();
    const cleanContent = String(content || '').trim();
    const cleanSession = String(session_label || '').trim();

    if (!cleanTitle) {
      return res.status(400).json({ error: 'Diary entry title is required.' });
    }
    if (!cleanContent) {
      return res.status(400).json({ error: 'Diary entry content cannot be empty.' });
    }

    const result = db
      .prepare(
        `INSERT INTO diary_entries (character_id, author_id, title, content, session_label)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(charId, req.user.id, cleanTitle, cleanContent, cleanSession);

    db.prepare(`UPDATE characters SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`).run(charId);
    db.prepare(`UPDATE rpg_tables SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`).run(
      character.table_id
    );

    const created = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE d.id = ?`
      )
      .get(result.lastInsertRowid);

    return res.status(201).json({
      entry: formatDiaryEntry(created, req.user.id)
    });
  });

  app.put('/api/diaries/:id', requireAuth, (req, res) => {
    const db = getDb();
    const entryId = Number(req.params.id);

    const existing = db
      .prepare(
        `SELECT
           d.*,
           c.table_id,
           c.user_id AS character_owner_id
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         WHERE d.id = ?`
      )
      .get(entryId);

    if (!existing) {
      return res.status(404).json({ error: 'Diary entry not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You no longer have access to this RPG table.' });
    }

    const isAuthor = Number(existing.author_id) === Number(req.user.id);
    const isCharOwner = Number(existing.character_owner_id) === Number(req.user.id);
    if (!isAuthor && !isCharOwner && !isTableOwner) {
      return res.status(403).json({ error: 'You are not authorized to edit this diary entry.' });
    }

    const { title, content, session_label } = req.body || {};
    const nextTitle = title !== undefined ? String(title).trim() : existing.title;
    const nextContent = content !== undefined ? String(content).trim() : existing.content;
    const nextSession = session_label !== undefined ? String(session_label).trim() : existing.session_label;

    if (!nextTitle || !nextContent) {
      return res.status(400).json({ error: 'Diary entry title and content cannot be empty.' });
    }

    db.prepare(
      `UPDATE diary_entries
       SET title = ?, content = ?, session_label = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`
    ).run(nextTitle, nextContent, nextSession, entryId);

    const updated = db
      .prepare(
        `SELECT
           d.*,
           c.name AS character_name,
           c.title AS character_title,
           c.avatar_url AS character_avatar,
           c.race AS character_race,
           c.character_class AS character_class,
           c.user_id AS character_owner_id,
           t.id AS table_id,
           t.name AS table_name,
           t.owner_id AS table_owner_id,
           u.display_name AS author_name,
           u.username AS author_username
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         JOIN rpg_tables t ON t.id = c.table_id
         JOIN users u ON u.id = d.author_id
         WHERE d.id = ?`
      )
      .get(entryId);

    return res.json({
      entry: formatDiaryEntry(updated, req.user.id)
    });
  });

  app.delete('/api/diaries/:id', requireAuth, (req, res) => {
    const db = getDb();
    const entryId = Number(req.params.id);

    const existing = db
      .prepare(
        `SELECT
           d.*,
           c.table_id,
           c.user_id AS character_owner_id
         FROM diary_entries d
         JOIN characters c ON c.id = d.character_id
         WHERE d.id = ?`
      )
      .get(entryId);

    if (!existing) {
      return res.status(404).json({ error: 'Diary entry not found.' });
    }

    const { hasAccess, isOwner: isTableOwner } = getTableAccess(db, existing.table_id, req.user.id);
    const isAuthor = Number(existing.author_id) === Number(req.user.id);
    const isCharOwner = Number(existing.character_owner_id) === Number(req.user.id);

    if (!hasAccess || (!isAuthor && !isCharOwner && !isTableOwner)) {
      return res.status(403).json({ error: 'You are not authorized to delete this diary entry.' });
    }

    db.prepare('DELETE FROM diary_entries WHERE id = ?').run(entryId);
    return res.json({ message: 'Diary entry removed from the Archive.' });
  });

  // Serve built frontend in production if dist/ exists
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

