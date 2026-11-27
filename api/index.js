import { initDb, ensureDbReady } from '../server/db.js';
import { createApp } from '../server/app.js';

initDb();
const app = createApp();

export default async function handler(req, res) {
  await ensureDbReady();
  return app(req, res);
}
