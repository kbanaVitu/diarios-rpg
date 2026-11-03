import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rpg-diaries-ancient-archive-secret-key-2026';
const TOKEN_EXPIRY = '7d';

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

export function verifyPassword(plainPassword, hash) {
  return bcrypt.compareSync(plainPassword, hash);
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      display_name: user.display_name
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function sanitizeUser(userRow) {
  if (!userRow) return null;
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    display_name: userRow.display_name,
    bio: userRow.bio || '',
    avatar_url: userRow.avatar_url || null,
    created_at: userRow.created_at,
    updated_at: userRow.updated_at
  };
}

export function requireAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies && req.cookies.rpg_token) {
      token = req.cookies.rpg_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to the Archive.' });
    }

    const decoded = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Checks whether a user has access to a given RPG table (either as owner or as member).
 * Returns { table, isOwner, membership, hasAccess }.
 */
export function getTableAccess(db, tableId, userId) {
  const table = db
    .prepare(
      `SELECT t.*, u.display_name AS owner_name, u.username AS owner_username
       FROM rpg_tables t
       JOIN users u ON u.id = t.owner_id
       WHERE t.id = ?`
    )
    .get(Number(tableId));

  if (!table) {
    return { table: null, isOwner: false, membership: null, hasAccess: false };
  }

  const isOwner = Number(table.owner_id) === Number(userId);
  const membership = db
    .prepare('SELECT * FROM table_members WHERE table_id = ? AND user_id = ?')
    .get(Number(tableId), Number(userId));

  const hasAccess = isOwner || Boolean(membership);
  return {
    table,
    isOwner,
    membership: membership || null,
    hasAccess
  };
}

