import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const schemaPath = path.join(__dirname, "..", "db", "schema.sql");

async function migrate() {
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  console.log("Schema applied successfully.");
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
