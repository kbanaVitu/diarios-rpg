import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDb, getDb, closeDb } from '../server/db.js';
import { createApp } from '../server/app.js';

const tmpUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpg-diaries-avatars-'));
process.env.UPLOAD_DIR = tmpUploadDir;

let app;

// Valid 1x1 transparent PNG buffer
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

beforeEach(() => {
  initDb(':memory:');
  app = createApp();
});

afterAll(() => {
  closeDb();
  try {
    fs.rmSync(tmpUploadDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

async function registerUser(username, email, displayName, password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({
    username,
    email,
    display_name: displayName,
    password
  });
  expect(res.status).toBe(201);
  return { token: res.body.token, user: res.body.user };
}

describe('RPG Diaries Global Visibility, Ownership Security & Campaign Timeline Suite', () => {
  it('1. Registers users with hashed passwords, authenticates via login, and blocks unauthenticated access', async () => {
    const { token, user } = await registerUser('jogador1', 'jogador1@rpg.local', 'Mestre da Mesa', 'secretPass99');
    expect(user.username).toBe('jogador1');
    expect(user.password_hash).toBeUndefined();

    // Verify password is hashed in SQLite database, never plaintext
    const db = getDb();
    const rawUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    expect(rawUser.password_hash).not.toBe('secretPass99');
    expect(rawUser.password_hash.startsWith('$2')).toBe(true);

    // Login with username and password
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'jogador1',
      password: 'secretPass99'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    // Reject wrong password
    const badLogin = await request(app).post('/api/auth/login').send({
      username: 'jogador1',
      password: 'wrongPassword'
    });
    expect(badLogin.status).toBe(401);

    // Unauthenticated requests to shared data must be blocked (authentication remains mandatory)
    const unauthTables = await request(app).get('/api/tables');
    expect(unauthTables.status).toBe(401);
    const unauthChars = await request(app).get('/api/characters');
    expect(unauthChars.status).toBe(401);
    const unauthDiaries = await request(app).get('/api/diaries');
    expect(unauthDiaries.status).toBe(401);

    // Verify /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.display_name).toBe('Mestre da Mesa');
  });

  it('2. Global Table Visibility & Table Ownership: User A creates a table -> User B can view and access it immediately, but only User A can edit or delete it', async () => {
    const userA = await registerUser('user_a', 'usera@rpg.local', 'User A');
    const userB = await registerUser('user_b', 'userb@rpg.local', 'User B');

    // User A creates an RPG table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Chronicles of Ironhold',
        description: 'A dark fantasy campaign in the northern peaks.',
        system: 'D&D 5e',
        era_label: 'Third Age'
      });
    expect(tableRes.status).toBe(201);
    const tableId = tableRes.body.table.id;
    expect(tableRes.body.table.is_owner).toBe(true);

    // User B (separate account, not explicitly invited) immediately sees the table in /api/tables and /api/dashboard
    const bListTables = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bListTables.status).toBe(200);
    expect(bListTables.body.tables.some((t) => t.id === tableId)).toBe(true);

    const bViewTable = await request(app)
      .get(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bViewTable.status).toBe(200);
    expect(bViewTable.body.table.name).toBe('Chronicles of Ironhold');
    expect(bViewTable.body.table.is_owner).toBe(false);

    // User B CANNOT edit or delete User A's table
    const bTryEditTable = await request(app)
      .put(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ name: 'Hijacked Table Name' });
    expect(bTryEditTable.status).toBe(403);

    const bTryDeleteTable = await request(app)
      .delete(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bTryDeleteTable.status).toBe(403);
  });

  it('3. Global Character Visibility & Strict Character Ownership: Any user can create a character in any table and view all characters, but ONLY the character owner can edit or delete it', async () => {
    const userA = await registerUser('user_a', 'a@rpg.local', 'User A (Table Owner)');
    const userB = await registerUser('user_b', 'b@rpg.local', 'User B (Player)');

    // User A creates a table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Campanha Compartilhada', description: 'Shared campaign' });
    const tableId = tableRes.body.table.id;

    // User A creates a character in the table
    const charARes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        table_id: tableId,
        name: 'Lyra Ashborn',
        title: 'Starweaver of the Astral Sea',
        race: 'Astral Tiefling',
        class: 'Chronurgy Mage',
        gender: 'Non-binary',
        biography: 'Paragraph 1: Born under a falling comet.\n\nParagraph 2: Keeper of the astral astrolabe.'
      });
    expect(charARes.status).toBe(201);
    const charAId = charARes.body.character.id;
    expect(charARes.body.character.is_owner).toBe(true);
    expect(charARes.body.character.can_edit).toBe(true);

    // User B can view User A's character profile in read-only mode
    const bViewCharA = await request(app)
      .get(`/api/characters/${charAId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bViewCharA.status).toBe(200);
    expect(bViewCharA.body.character.name).toBe('Lyra Ashborn');
    expect(bViewCharA.body.character.is_owner).toBe(false);
    expect(bViewCharA.body.character.can_edit).toBe(false);
    expect(bViewCharA.body.character.can_write_diary).toBe(false);

    // User B CANNOT edit or delete User A's character
    const bTryEditCharA = await request(app)
      .put(`/api/characters/${charAId}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ name: 'Tampered Name' });
    expect(bTryEditCharA.status).toBe(403);

    const bTryDeleteCharA = await request(app)
      .delete(`/api/characters/${charAId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bTryDeleteCharA.status).toBe(403);

    // User B creates another character in User A's table (without needing explicit table membership)
    const charBRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({
        table_id: tableId,
        name: 'Garrick Ironshield',
        race: 'Human',
        class: 'Fighter',
        gender: 'Male',
        biography: 'Veteran vanguard of the northern marches.'
      });
    expect(charBRes.status).toBe(201);
    const charBId = charBRes.body.character.id;

    // User A can see User B's character in the table and view its profile
    const aViewTable = await request(app)
      .get(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(aViewTable.status).toBe(200);
    expect(aViewTable.body.characters.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Lyra Ashborn', 'Garrick Ironshield'])
    );

    // Even though User A owns the table, User A CANNOT edit or delete User B's character!
    const aViewCharB = await request(app)
      .get(`/api/characters/${charBId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(aViewCharB.status).toBe(200);
    expect(aViewCharB.body.character.is_owner).toBe(false);
    expect(aViewCharB.body.character.can_edit).toBe(false);

    const aTryEditCharB = await request(app)
      .put(`/api/characters/${charBId}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'GM Override Attempt' });
    expect(aTryEditCharB.status).toBe(403);

    const aTryDeleteCharB = await request(app)
      .delete(`/api/characters/${charBId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(aTryDeleteCharB.status).toBe(403);

    // User A CAN edit their own character
    const aEditCharA = await request(app)
      .put(`/api/characters/${charAId}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Archmage Lyra Ashborn',
        gender: 'Non-binary',
        race: 'Tiefling',
        class: 'Archmage',
        biography: 'Updated biography text.',
        user_id: userB.user.id // Attempted ownership transfer payload must be ignored
      });
    expect(aEditCharA.status).toBe(200);
    expect(aEditCharA.body.character.name).toBe('Archmage Lyra Ashborn');
    expect(aEditCharA.body.character.user_id).toBe(userA.user.id);
  });

  it('4. Persists character profile picture uploads, enforces owner-only avatar modification, and rejects spoofed files', async () => {
    const owner = await registerUser('portrait_owner', 'portrait@rpg.local', 'Portrait Owner');
    const otherUser = await registerUser('other_viewer', 'viewer@rpg.local', 'Other Viewer');

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Gallery Campaign' });
    const tableId = tableRes.body.table.id;

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        table_id: tableId,
        name: 'Sir Roland',
        race: 'Human',
        class: 'Paladin',
        gender: 'Male'
      });
    const charId = charRes.body.character.id;

    // Non-owner cannot upload or delete another user's character portrait
    const unauthUpload = await request(app)
      .post(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .attach('avatar', VALID_PNG_BUFFER, {
        filename: 'hijack.png',
        contentType: 'image/png'
      });
    expect(unauthUpload.status).toBe(403);

    // Owner uploads a valid PNG image
    const uploadRes = await request(app)
      .post(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('avatar', VALID_PNG_BUFFER, {
        filename: 'roland.png',
        contentType: 'image/png'
      });
    expect(uploadRes.status).toBe(200);
    const avatarUrl = uploadRes.body.character.avatar_url;
    expect(avatarUrl).toMatch(/^\/uploads\/avatars\/char-.*\.png$/);

    // Non-owner cannot delete the portrait
    const unauthDeleteAvatar = await request(app)
      .delete(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${otherUser.token}`);
    expect(unauthDeleteAvatar.status).toBe(403);

    // Verify the uploaded file can be fetched via HTTP
    const getImgRes = await request(app).get(avatarUrl);
    expect(getImgRes.status).toBe(200);
    expect(getImgRes.headers['content-type']).toMatch(/image\/png/);

    // Reject a spoofed non-image file claiming to be image/png
    const fakeBuffer = Buffer.from('<!DOCTYPE html><script>alert(1)</script>', 'utf-8');
    const spoofRes = await request(app)
      .post(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('avatar', fakeBuffer, {
        filename: 'exploit.png',
        contentType: 'image/png'
      });
    expect(spoofRes.status).toBe(400);
  });

  it('5. Diary Ownership & Campaign Timeline: All users can read diary entries and view the mixed chronological Campaign Timeline, while only the entry owner can edit or delete', async () => {
    const userA = await registerUser('alice', 'alice@rpg.local', 'Alice');
    const userB = await registerUser('bruno', 'bruno@rpg.local', 'Bruno');

    // User A creates a table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Out of the Abyss' });
    const tableId = tableRes.body.table.id;

    // User A creates Character 1
    const charARes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        table_id: tableId,
        name: 'Aelar',
        race: 'Elf',
        class: 'Cleric',
        gender: 'Female'
      });
    const charAId = charARes.body.character.id;

    // User B creates Character 2 in the same table
    const charBRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({
        table_id: tableId,
        name: 'Baldum Ironbeard',
        race: 'Dwarf',
        class: 'Fighter',
        gender: 'Male'
      });
    const charBId = charBRes.body.character.id;

    // User B cannot create a diary entry on User A's character
    const crossCreateAttempt = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({
        character_id: charAId,
        title: 'Impersonation Entry',
        content: 'Trying to write in Aelar diary.'
      });
    expect(crossCreateAttempt.status).toBe(403);

    // User A creates Entry 1 (older)
    const entry1Res = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        character_id: charAId,
        title: 'First Light in Velkynvelve',
        session_label: 'Sessão I',
        content: 'We awoke in chains above the subterranean waterfall.'
      });
    expect(entry1Res.status).toBe(201);
    const entry1Id = entry1Res.body.entry.id;

    // User B creates Entry 2 (middle)
    const entry2Res = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({
        character_id: charBId,
        title: 'Breaking the Iron Grate',
        session_label: 'Sessão I',
        content: 'Baldum shattered the rusted lock with an improvised iron bar.'
      });
    expect(entry2Res.status).toBe(201);
    const entry2Id = entry2Res.body.entry.id;

    // User A creates Entry 3 (newest)
    const entry3Res = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        character_id: charAId,
        title: 'Crossing the Darklake',
        session_label: 'Sessão II',
        content: 'Our raft drifted past glowing fungi and silent ruins.'
      });
    expect(entry3Res.status).toBe(201);
    const entry3Id = entry3Res.body.entry.id;

    // Enforce deterministic timestamps so we can test strict chronological ordering (newest first) and date filtering
    const db = getDb();
    db.prepare('UPDATE diary_entries SET created_at = ? WHERE id = ?').run('2026-10-10T18:00:00Z', entry1Id);
    db.prepare('UPDATE diary_entries SET created_at = ? WHERE id = ?').run('2026-10-12T20:30:00Z', entry2Id);
    db.prepare('UPDATE diary_entries SET created_at = ? WHERE id = ?').run('2026-10-15T22:15:00Z', entry3Id);

    // User B can read User A's diary entry directly
    const bReadEntry1 = await request(app)
      .get(`/api/diaries/${entry1Id}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bReadEntry1.status).toBe(200);
    expect(bReadEntry1.body.entry.title).toBe('First Light in Velkynvelve');
    expect(bReadEntry1.body.entry.can_edit).toBe(false);

    // User B CANNOT edit or delete User A's diary entry
    const bTryEditEntry1 = await request(app)
      .put(`/api/diaries/${entry1Id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ title: 'Hacked Title', content: 'Hacked content' });
    expect(bTryEditEntry1.status).toBe(403);

    const bTryDeleteEntry1 = await request(app)
      .delete(`/api/diaries/${entry1Id}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(bTryDeleteEntry1.status).toBe(403);

    // Even Table Owner (User A) CANNOT edit or delete User B's diary entry
    const aTryEditEntry2 = await request(app)
      .put(`/api/diaries/${entry2Id}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ title: 'GM Override', content: 'GM Override' });
    expect(aTryEditEntry2.status).toBe(403);

    const aTryDeleteEntry2 = await request(app)
      .delete(`/api/diaries/${entry2Id}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(aTryDeleteEntry2.status).toBe(403);

    // Campaign Timeline: Both users see all diary entries mixed chronologically (newest first, not grouped by character)
    const timelineRes = await request(app)
      .get(`/api/tables/${tableId}/timeline`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.timeline.map((e) => e.id)).toEqual([entry3Id, entry2Id, entry1Id]);
    expect(timelineRes.body.timeline.map((e) => e.character_name)).toEqual([
      'Aelar',
      'Baldum Ironbeard',
      'Aelar'
    ]);
    expect(timelineRes.body.timeline[0].author_username).toBe('alice');
    expect(timelineRes.body.timeline[1].author_username).toBe('bruno');

    // Timeline filtering by character_id
    const filterByCharB = await request(app)
      .get(`/api/tables/${tableId}/timeline?character_id=${charBId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(filterByCharB.status).toBe(200);
    expect(filterByCharB.body.timeline).toHaveLength(1);
    expect(filterByCharB.body.timeline[0].id).toBe(entry2Id);

    // Timeline filtering by date (YYYY-MM-DD)
    const filterByDate = await request(app)
      .get(`/api/tables/${tableId}/timeline?date=2026-10-10`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(filterByDate.status).toBe(200);
    expect(filterByDate.body.timeline).toHaveLength(1);
    expect(filterByDate.body.timeline[0].id).toBe(entry1Id);

    // Verify database-level triggers prevent ownership tampering or unauthorized diary creation
    expect(() => {
      db.prepare('UPDATE characters SET user_id = ? WHERE id = ?').run(userB.user.id, charAId);
    }).toThrow(/Character ownership cannot be transferred/);

    expect(() => {
      db.prepare(
        `INSERT INTO diary_entries (character_id, author_id, title, content)
         VALUES (?, ?, 'DB Trigger Test', 'Direct SQL bypass attempt')`
      ).run(charAId, userB.user.id);
    }).toThrow(/Diary entry author must be authorized as the owner of the character/);

    expect(() => {
      db.prepare('UPDATE diary_entries SET author_id = ? WHERE id = ?').run(userB.user.id, entry1Id);
    }).toThrow(/Diary entry ownership and character association cannot be modified/);
  });
});
