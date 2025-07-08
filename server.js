const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: "postgresql://postgres:Rockstar@2002@db.rrcwuhhunxcdboandeaf.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const tableName = "vigrously"; // <-- Your chosen table name

async function createTable(headers) {
  const colsSQL = headers.map(col => `"${col}" TEXT`).join(", ");
  const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (id SERIAL PRIMARY KEY, ${colsSQL});`;
  await pool.query(createSQL);
}

async function getExistingColumns() {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1;`,
    [tableName]
  );
  return res.rows.map(r => r.column_name);
}

async function addMissingColumns(headers) {
  const existingCols = await getExistingColumns();
  for (const col of headers) {
    if (!existingCols.includes(col)) {
      await pool.query(`ALTER TABLE "${tableName}" ADD COLUMN "${col}" TEXT;`);
    }
  }
}

async function insertData(headers, rows) {
  for (const row of rows) {
    const placeholders = headers.map((_, i) => `$${i + 1}`).join(", ");
    const insertSQL = `INSERT INTO "${tableName}" (${headers.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders});`;
    await pool.query(insertSQL, row);
  }
}

app.post("/sync-sheet", async (req, res) => {
  const { headers, data } = req.body;

  try {
    await createTable(headers);
    await addMissingColumns(headers);
    await insertData(headers, data);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
