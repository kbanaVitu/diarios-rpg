import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, getDb, closeDb, purgeDemoData } from '../server/db.js';
import { createApp } from '../server/app.js';
import { t, formatRole, formatTableStatus } from '../src/i18n/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;

beforeEach(() => {
  initDb(':memory:');
  app = createApp();
});

afterAll(() => {
  closeDb();
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

describe('Demo Cleanup, Global Dashboard Aggregation, Localization & Campaign Timeline UI', () => {
  it('1. Starts with a clean database (no demo accounts or seeded data) and purges any legacy demo data while preserving real users', async () => {
    const db = getDb();

    // Fresh DB must have zero pre-seeded demo users, tables, characters, or diary entries
    expect(db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS cnt FROM rpg_tables').get().cnt).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS cnt FROM characters').get().cnt).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS cnt FROM diary_entries').get().cnt).toBe(0);

    // Create a real user, real table, real character, and real diary entry
    const realUser = await registerUser('mestre_real', 'real@player.com', 'Mestre Real');
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${realUser.token}`)
      .send({ name: 'Out of The Abyss', system: 'D&D 5e' });
    const realTableId = tableRes.body.table.id;

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${realUser.token}`)
      .send({
        table_id: realTableId,
        name: 'Baldum Ironbeard',
        race: 'Dwarf',
        class: 'Fighter',
        gender: 'Male'
      });
    const realCharId = charRes.body.character.id;

    await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${realUser.token}`)
      .send({
        character_id: realCharId,
        title: 'Capítulo I',
        content: 'Relato real da campanha.'
      });

    // Simulate legacy demo records in the database and verify purgeDemoData removes only demo data
    const demoUserId = db
      .prepare(
        `INSERT INTO users (username, email, display_name, password_hash)
         VALUES ('aldric', 'aldric@archive.rpg', 'Master Aldric Vance', 'hash')`
      )
      .run().lastInsertRowid;

    const demoTableId = db
      .prepare(
        `INSERT INTO rpg_tables (name, description, owner_id)
         VALUES ('The Ashen Crown of Valdoria', 'Demo table', ?)`
      )
      .run(demoUserId).lastInsertRowid;

    const demoCharId = db
      .prepare(
        `INSERT INTO characters (table_id, user_id, name, gender, race, character_class)
         VALUES (?, ?, 'Vaelen Whisperwind', 'Non-binary', 'Tiefling', 'Bard')`
      )
      .run(demoTableId, demoUserId).lastInsertRowid;

    db.prepare(
      `INSERT INTO diary_entries (character_id, author_id, title, content)
       VALUES (?, ?, 'Demo Entry', 'Demo content')`
    ).run(demoCharId, demoUserId);

    const purgeResult = purgeDemoData(db);
    expect(purgeResult.purgedUsers).toBe(1);
    expect(purgeResult.purgedCharacters).toBe(1);

    // Verify demo records are gone and real user records remain intact
    const usersLeft = db.prepare('SELECT username FROM users').all();
    expect(usersLeft.map((u) => u.username)).toEqual(['mestre_real']);

    const tablesLeft = db.prepare('SELECT name FROM rpg_tables').all();
    expect(tablesLeft.map((t) => t.name)).toEqual(['Out of The Abyss']);

    const charsLeft = db.prepare('SELECT name FROM characters').all();
    expect(charsLeft.map((c) => c.name)).toEqual(['Baldum Ironbeard']);

    const entriesLeft = db.prepare('SELECT title FROM diary_entries').all();
    expect(entriesLeft.map((e) => e.title)).toEqual(['Capítulo I']);
  });

  it('2. Serves global dashboard summary and preserves global read access across accounts', async () => {
    const userA = await registerUser('jogador_a', 'a@grupo.rpg', 'Jogador A');
    const userB = await registerUser('jogador_b', 'b@grupo.rpg', 'Jogador B');

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Crônicas do Abismo' });
    const tableId = tableRes.body.table.id;

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        table_id: tableId,
        name: 'Demogorgon',
        race: 'Fiend',
        class: 'Warlock',
        gender: 'Other'
      });
    const charId = charRes.body.character.id;

    const entryRes = await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        character_id: charId,
        title: 'Nas Profundezas',
        content: 'As sombras se movem no Lago Escuro.'
      });
    const entryId = entryRes.body.entry.id;

    // User B sees User A's table, character, and diary entry on the global dashboard and endpoints
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.stats.total_tables).toBe(1);
    expect(dashRes.body.stats.owned_tables_count).toBe(0);
    expect(dashRes.body.stats.participating_tables_count).toBe(1);
    expect(dashRes.body.characters).toHaveLength(1);
    expect(dashRes.body.recent_entries).toHaveLength(1);

    const timelineView = await request(app)
      .get(`/api/tables/${tableId}/timeline`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(timelineView.status).toBe(200);
    expect(timelineView.body.timeline).toHaveLength(1);

    const charView = await request(app)
      .get(`/api/characters/${charId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(charView.status).toBe(200);
    expect(charView.body.character.can_edit).toBe(false);

    const diaryView = await request(app)
      .get(`/api/diaries/${entryId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(diaryView.status).toBe(200);
    expect(diaryView.body.entry.can_edit).toBe(false);
  });

  it('3. Cascades deletions cleanly with zero orphan characters or diary entries', async () => {
    const db = getDb();
    const owner = await registerUser('dono_mesa', 'dono@grupo.rpg', 'Dono da Mesa');

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Mesa Temporária' });
    const tableId = tableRes.body.table.id;

    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        table_id: tableId,
        name: 'Herói Temporário',
        race: 'Humano',
        class: 'Guerreiro',
        gender: 'Masculino'
      });

    await request(app)
      .post('/api/diaries')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        character_id: charRes.body.character.id,
        title: 'Relato Temporário',
        content: 'Conteúdo que deve ser removido em cascata.'
      });

    // Delete Table
    const delRes = await request(app)
      .delete(`/api/tables/${tableId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(delRes.status).toBe(200);

    // Verify no characters or diary entries from the deleted table remain
    const remainingChars = db
      .prepare('SELECT COUNT(*) AS cnt FROM characters WHERE table_id = ?')
      .get(tableId);
    expect(remainingChars.cnt).toBe(0);

    const orphanEntries = db
      .prepare(
        'SELECT COUNT(*) AS cnt FROM diary_entries WHERE character_id NOT IN (SELECT id FROM characters)'
      )
      .get();
    expect(orphanEntries.cnt).toBe(0);
  });

  it('4. Verifies login screen has no demo accounts/shortcuts, server has no seed script, and UI is localized in pt-BR', () => {
    expect(t('nav.home')).toBe('Início');
    expect(t('nav.myTables')).toBe('Minhas Mesas');
    expect(t('nav.characters')).toBe('Personagens');
    expect(t('nav.chronicles')).toBe('Crônicas');
    expect(t('nav.account')).toBe('Conta');
    expect(t('tableDetail.tabOverview')).toBe('Visão Geral da Mesa');
    expect(t('tableDetail.tabCharacters', { count: 3 })).toBe('Personagens (3)');
    expect(t('tableDetail.tabTimeline')).toBe('Linha do Tempo');
    expect(t('tableDetail.emptyTimelineText')).toBe(
      'Esta mesa ainda não possui registros. As histórias desta campanha aparecerão aqui.'
    );
    expect(formatRole('owner')).toBe('Criador da Mesa');
    expect(formatRole('chronicler')).toBe('Cronista');
    expect(formatTableStatus('active')).toBe('Ativa');

    const authVue = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'views', 'AuthView.vue'), 'utf-8');
    expect(authVue).not.toContain('quickLogin');
    expect(authVue).not.toContain('Aldric');
    expect(authVue).not.toContain('Elena Thorne');
    expect(authVue).not.toContain('Kaelen Ashwood');
    expect(authVue).not.toContain('archive123');
    expect(authVue).not.toContain('demoDivider');

    const serverIndex = fs.readFileSync(path.resolve(__dirname, '..', 'server', 'index.js'), 'utf-8');
    expect(serverIndex).not.toContain('seedIfEmpty');
    expect(fs.existsSync(path.resolve(__dirname, '..', 'server', 'seed.js'))).toBe(false);

    const appVue = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'App.vue'), 'utf-8');
    expect(appVue).not.toContain('Medieval Chronicle Archive');
    expect(appVue).not.toContain('brand-subtitle');
    expect(appVue).toContain('D20 Dice Icon');
    expect(appVue).toContain('Crossed Swords Icon');
  });

  it('5. Supports Vercel Serverless Data URL avatar storage when VERCEL or TURSO_DATABASE_URL is enabled', async () => {
    const validPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    process.env.VERCEL = '1';
    try {
      const user = await registerUser('vercel_player', 'vercel@rpg.local', 'Vercel Player');
      const tableRes = await request(app)
        .post('/api/tables')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Cloud Campaign' });

      const charRes = await request(app)
        .post('/api/characters')
        .set('Authorization', `Bearer ${user.token}`)
        .field('table_id', String(tableRes.body.table.id))
        .field('name', 'Cloud Hero')
        .field('race', 'Elf')
        .field('class', 'Ranger')
        .field('gender', 'Female')
        .attach('avatar', validPng, {
          filename: 'hero.png',
          contentType: 'image/png'
        });

      expect(charRes.status).toBe(201);
      expect(charRes.body.character.avatar_url).toMatch(/^data:image\/png;base64,/);
    } finally {
      delete process.env.VERCEL;
    }
  });
});
