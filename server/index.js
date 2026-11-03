import { initDb } from './db.js';
import { seedIfEmpty } from './seed.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);

initDb();
if (process.env.SKIP_SEED !== 'true') {
  seedIfEmpty();
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`📜 RPG Diaries Archive Server listening on http://localhost:${PORT}`);
});

