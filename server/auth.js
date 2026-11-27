import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, ensureDbReady } from './db.js';

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

export async function requireAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies && req.cookies.rpg_token) {
      token = req.cookies.rpg_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Autenticação necessária. Faça login para acessar o Arquivo.' });
    }

    const decoded = verifyToken(token);
    await ensureDbReady();
    const db = getDb();
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'A conta de usuário não existe mais.' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

/**
 * Checks RPG table existence and ownership.
 * Under the shared group visibility model, all authenticated users have read access (hasAccess: true)
 * to every existing table, while administrative mutations remain restricted to isOwner.
 */
export async function getTableAccess(db, tableId, userId) {
  const table = await db
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
  const membership = await db
    .prepare('SELECT * FROM table_members WHERE table_id = ? AND user_id = ?')
    .get(Number(tableId), Number(userId));

  return {
    table,
    isOwner,
    membership: membership || null,
    hasAccess: true
  };
}
