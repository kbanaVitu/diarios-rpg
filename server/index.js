import { initDb, ensureDbReady } from './db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);

initDb();
await ensureDbReady();

const app = createApp();

app.listen(PORT, () => {
  console.log(`📜 RPG Diaries Archive Server listening on http://localhost:${PORT}`);
});
