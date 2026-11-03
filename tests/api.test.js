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

describe('RPG Diaries Full-Stack Architecture & Security Suite', () => {
  it('1. Registers users with hashed passwords and authenticates via login and /api/auth/me', async () => {
    const { token, user } = await registerUser('aldric', 'aldric@rpg.local', 'Master Aldric', 'secretPass99');
    expect(user.username).toBe('aldric');
    expect(user.password_hash).toBeUndefined();

    // Verify password is hashed in SQLite database, never plaintext
    const db = getDb();
    const rawUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    expect(rawUser.password_hash).not.toBe('secretPass99');
    expect(rawUser.password_hash.startsWith('$2')).toBe(true);

    // Login with username and password
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'aldric',
      password: 'secretPass99'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    // Reject wrong password
    const badLogin = await request(app).post('/api/auth/login').send({
      username: 'aldric',
      password: 'wrongPassword'
    });
    expect(badLogin.status).toBe(401);

    // Verify /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.display_name).toBe('Master Aldric');
  });

  it('2. Enforces RPG Table ownership, membership management, and unauthorized access blocks', async () => {
    const owner = await registerUser('gm_owner', 'gm@rpg.local', 'GM Owner');
    const member = await registerUser('player_elena', 'elena@rpg.local', 'Elena Player');
    const outsider = await registerUser('outsider_bob', 'bob@rpg.local', 'Outsider Bob');

    // Owner creates an RPG table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Chronicles of Ironhold',
        description: 'A dark fantasy campaign in the northern peaks.',
        system: 'D&D 5e',
        era_label: 'Third Age'
      });
    expect(tableRes.status).toBe(201);
    const tableId = tableRes.body.table.id;
    expect(tableRes.body.table.is_owner).toBe(true);

    // Outsider cannot view the table
    const outsiderView = await request(app)
      .get(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(outsiderView.status).toBe(403);

    // Owner adds Elena as a member
    const addMemberRes = await request(app)
      .post(`/api/tables/${tableId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ username: 'player_elena', role: 'chronicler' });
    expect(addMemberRes.status).toBe(201);
    expect(addMemberRes.body.member.role).toBe('chronicler');

    // Member Elena can now view the table
    const memberView = await request(app)
      .get(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(memberView.status).toBe(200);
    expect(memberView.body.table.is_owner).toBe(false);
    expect(memberView.body.table.my_role).toBe('chronicler');

    // Member Elena CANNOT add outsider Bob or modify table settings (ownership vs membership separation)
    const memberTryInvite = await request(app)
      .post(`/api/tables/${tableId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ username: 'outsider_bob', role: 'player' });
    expect(memberTryInvite.status).toBe(403);

    const memberTryEditTable = await request(app)
      .put(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Hijacked Table Name' });
    expect(memberTryEditTable.status).toBe(403);
  });

  it('3. Supports Character creation, flexible profile attributes, and strict ownership permissions', async () => {
    const gm = await registerUser('gm_vance', 'vance@rpg.local', 'GM Vance');
    const player1 = await registerUser('elena', 'elena@rpg.local', 'Elena');
    const player2 = await registerUser('kaelen', 'kaelen@rpg.local', 'Kaelen');
    const outsider = await registerUser('stranger', 'stranger@rpg.local', 'Stranger');

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${gm.token}`)
      .send({ name: 'Valdoria Campaign', description: 'Main campaign' });
    const tableId = tableRes.body.table.id;

    await request(app)
      .post(`/api/tables/${tableId}/members`)
      .set('Authorization', `Bearer ${gm.token}`)
      .send({ username: 'elena', role: 'player' });
    await request(app)
      .post(`/api/tables/${tableId}/members`)
      .set('Authorization', `Bearer ${gm.token}`)
      .send({ username: 'kaelen', role: 'player' });

    // Player 1 creates a character with custom/flexible race, class, gender, and multiline biography
    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${player1.token}`)
      .send({
        table_id: tableId,
        name: 'Lyra Ashborn',
        title: 'Starweaver of the Astral Sea',
        race: 'Astral Tiefling-blooded',
        class: 'Chronurgy Mage / Lore Bard',
        gender: 'Non-binary (They/She)',
        biography: 'Paragraph 1: Born under a falling comet.\n\nParagraph 2: Keeper of the astral astrolabe.'
      });
    expect(charRes.status).toBe(201);
    const charId = charRes.body.character.id;
    expect(charRes.body.character.race).toBe('Astral Tiefling-blooded');
    expect(charRes.body.character.class).toBe('Chronurgy Mage / Lore Bard');
    expect(charRes.body.character.biography).toContain('\n\nParagraph 2:');

    // Player 2 (same table member) can view Lyra's character profile
    const p2ViewProfile = await request(app)
      .get(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${player2.token}`);
    expect(p2ViewProfile.status).toBe(200);
    expect(p2ViewProfile.body.character.name).toBe('Lyra Ashborn');
    expect(p2ViewProfile.body.character.can_edit).toBe(false);

    // Player 2 CANNOT edit Player 1's character profile
    const p2TryEdit = await request(app)
      .put(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${player2.token}`)
      .send({ name: 'Tampered Name' });
    expect(p2TryEdit.status).toBe(403);

    // Outsider CANNOT view Lyra's profile at all
    const outsiderView = await request(app)
      .get(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(outsiderView.status).toBe(403);

    // Player 1 CAN edit their own character profile
    const p1Edit = await request(app)
      .put(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${player1.token}`)
      .send({
        name: 'Archmage Lyra Ashborn',
        gender: 'Non-binary',
        race: 'Tiefling',
        class: 'Archmage',
        biography: 'Updated biography text.'
      });
    expect(p1Edit.status).toBe(200);
    expect(p1Edit.body.character.name).toBe('Archmage Lyra Ashborn');
  });

  it('4. Persists character profile picture uploads and rejects invalid/spoofed files', async () => {
    const user = await registerUser('portrait_user', 'portrait@rpg.local', 'Portrait User');
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Gallery Campaign' });
    const tableId = tableRes.body.table.id;

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        table_id: tableId,
        name: 'Sir Roland',
        race: 'Human',
        class: 'Paladin',
        gender: 'Male'
      });
    const charId = charRes.body.character.id;
    expect(charRes.body.character.avatar_url).toBeNull();

    // Upload a valid PNG image
    const uploadRes = await request(app)
      .post(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('avatar', VALID_PNG_BUFFER, {
        filename: 'roland.png',
        contentType: 'image/png'
      });
    expect(uploadRes.status).toBe(200);
    const avatarUrl = uploadRes.body.character.avatar_url;
    expect(avatarUrl).toMatch(/^\/uploads\/avatars\/char-.*\.png$/);

    // Verify the uploaded file can be fetched via HTTP and exists on disk
    const getImgRes = await request(app).get(avatarUrl);
    expect(getImgRes.status).toBe(200);
    expect(getImgRes.headers['content-type']).toMatch(/image\/png/);

    // Reject a spoofed non-image file claiming to be image/png
    const fakeBuffer = Buffer.from('<!DOCTYPE html><script>alert(1)</script>', 'utf-8');
    const spoofRes = await request(app)
      .post(`/api/characters/${charId}/avatar`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('avatar', fakeBuffer, {
        filename: 'exploit.png',
        contentType: 'image/png'
      });
    expect(spoofRes.status).toBe(400);
  });

  it('5. Enforces User -> RPG Table -> Character -> Diary Entry hierarchy and blocks orphan or unauthorized notes', async () => {
    const gm = await registerUser('gm_scribe', 'gm_scribe@rpg.local', 'GM Scribe');
    const player = await registerUser('player_scribe', 'player_scribe@rpg.local', 'Player Scribe');
    const otherUser = await registerUser('other_user', 'other@rpg.local', 'Other User');

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${gm.token}`)
      .send({ name: 'Sword Coast Chronicles' });
    const tableId = tableRes.body.table.id;

    await request(app)
      .post(`/api/tables/${tableId}/members`)
      .set('Authorization', `Bearer ${gm.token}`)
      .send({ username: 'player_scribe', role: 'player' });

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${player.token}`)
      .send({
        table_id: tableId,
        name: 'Brynja Frostbeard',
        race: 'Dwarf',
        class: 'Warrior',
        gender: 'Female'
      });
    const charId = charRes.body.character.id;

    // Attempt to create an orphan diary entry without a character_id -> must fail with 400
    const orphanRes = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${player.token}`)
      .send({
        title: 'Orphan Note',
        content: 'This note has no character.'
      });
    expect(orphanRes.status).toBe(400);

    // Attempt by unauthorized otherUser to create a diary entry on Brynja -> must fail with 403
    const unauthDiaryRes = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({
        character_id: charId,
        title: 'Unauthorized Entry',
        content: 'Should be blocked.'
      });
    expect(unauthDiaryRes.status).toBe(403);

    // Authorized character owner creates a diary entry
    const entry1Res = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${player.token}`)
      .send({
        character_id: charId,
        title: 'Into the Frost Caverns',
        session_label: 'Session I',
        content: 'We descended the icy stairs.\n\nThe runes glowed faint blue.'
      });
    expect(entry1Res.status).toBe(201);
    const entryId = entry1Res.body.entry.id;

    // Verify entry appears on the character profile feed
    const profileRes = await request(app)
      .get(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${player.token}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.diary_entries).toHaveLength(1);
    expect(profileRes.body.diary_entries[0].title).toBe('Into the Frost Caverns');
    expect(profileRes.body.diary_entries[0].content).toContain('\n\nThe runes glowed faint blue.');

    // Edit diary entry
    const editRes = await request(app)
      .put(`/api/diaries/${entryId}`)
      .set('Authorization', `Bearer ${player.token}`)
      .send({
        title: 'Into the Frost Caverns (Revised)',
        content: 'Updated chronicle text.'
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.entry.title).toBe('Into the Frost Caverns (Revised)');

    // Verify database-level trigger blocks direct invalid SQLite insertion for unauthorized user
    const db = getDb();
    expect(() => {
      db.prepare(
        `INSERT INTO diary_entries (character_id, author_id, title, content)
         VALUES (?, ?, 'DB Trigger Test', 'Direct SQL bypass attempt')`
      ).run(charId, otherUser.user.id);
    }).toThrow(/Diary entry author must be authorized/);
  });
});

