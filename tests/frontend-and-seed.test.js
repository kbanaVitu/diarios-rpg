import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { initDb, getDb, closeDb } from '../server/db.js';
import { seedIfEmpty } from '../server/seed.js';
import { createApp } from '../server/app.js';

let app;

beforeEach(() => {
  initDb(':memory:');
  app = createApp();
});

afterAll(() => {
  closeDb();
});

describe('Seed Data, Dashboard Aggregation & Cascade Integrity', () => {
  it('1. Seeds realistic medieval archive data idempotently and serves dashboard summary', async () => {
    const firstSeed = seedIfEmpty();
    expect(firstSeed.seeded).toBe(true);

    const secondSeed = seedIfEmpty();
    expect(secondSeed.seeded).toBe(false);

    // Sign in as Elena Thorne (owns 1 table, member of 1 table)
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'elena',
      password: 'archive123'
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.stats.total_tables).toBe(2);
    expect(dashRes.body.stats.owned_tables_count).toBe(1);
    expect(dashRes.body.stats.participating_tables_count).toBe(1);
    expect(dashRes.body.characters.length).toBeGreaterThanOrEqual(4);
    expect(dashRes.body.recent_entries.length).toBeGreaterThanOrEqual(5);
  });

  it('2. Immediately revokes table, character, and chronicle access when a member is removed', async () => {
    seedIfEmpty();

    const aldricLogin = await request(app).post('/api/auth/login').send({
      username: 'aldric',
      password: 'archive123'
    });
    const kaelenLogin = await request(app).post('/api/auth/login').send({
      username: 'kaelen',
      password: 'archive123'
    });

    // Kaelen can initially access Table 1 (The Ashen Crown of Valdoria) and its characters
    const initialAccess = await request(app)
      .get('/api/tables/1')
      .set('Authorization', `Bearer ${kaelenLogin.body.token}`);
    expect(initialAccess.status).toBe(200);

    // Table owner Aldric removes Kaelen from Table 1
    const removeRes = await request(app)
      .delete(`/api/tables/1/members/${kaelenLogin.body.user.id}`)
      .set('Authorization', `Bearer ${aldricLogin.body.token}`);
    expect(removeRes.status).toBe(200);

    // Kaelen can no longer view Table 1, its characters, or its diary entries
    const revokedTable = await request(app)
      .get('/api/tables/1')
      .set('Authorization', `Bearer ${kaelenLogin.body.token}`);
    expect(revokedTable.status).toBe(403);

    const revokedChar = await request(app)
      .get('/api/characters/1')
      .set('Authorization', `Bearer ${kaelenLogin.body.token}`);
    expect(revokedChar.status).toBe(403);

    const revokedDiary = await request(app)
      .get('/api/diaries/1')
      .set('Authorization', `Bearer ${kaelenLogin.body.token}`);
    expect(revokedDiary.status).toBe(403);
  });

  it('3. Cascades deletions cleanly with zero orphan characters or diary entries', async () => {
    seedIfEmpty();
    const db = getDb();

    const aldricLogin = await request(app).post('/api/auth/login').send({
      username: 'aldric',
      password: 'archive123'
    });

    // Delete Table 1
    const delRes = await request(app)
      .delete('/api/tables/1')
      .set('Authorization', `Bearer ${aldricLogin.body.token}`);
    expect(delRes.status).toBe(200);

    // Verify no characters or diary entries from Table 1 remain
    const remainingCharsInTable1 = db
      .prepare('SELECT COUNT(*) AS cnt FROM characters WHERE table_id = 1')
      .get();
    expect(remainingCharsInTable1.cnt).toBe(0);

    const orphanEntries = db
      .prepare(
        'SELECT COUNT(*) AS cnt FROM diary_entries WHERE character_id NOT IN (SELECT id FROM characters)'
      )
      .get();
    expect(orphanEntries.cnt).toBe(0);
  });
});

