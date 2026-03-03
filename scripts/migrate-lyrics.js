import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await pool.query(`
    ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lyrics_text TEXT;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tracks_lyrics
    ON tracks USING gin(to_tsvector('simple', COALESCE(lyrics_text, '')));
  `).catch((err) => {
    console.warn("Index creation skipped (may already exist):", err.message);
  });
  console.log("Lyrics column and index applied.");
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
