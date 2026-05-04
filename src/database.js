const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'postgres-5ljq.internal',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'mydb',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'montage2026',
  ssl: false
});

async function init() {
  // Table profils intérimaires
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interim_profiles (
      id               SERIAL PRIMARY KEY,
      discord_user_id  TEXT NOT NULL DEFAULT '',
      discord_username TEXT NOT NULL DEFAULT '',
      guild_id         TEXT NOT NULL DEFAULT '',
      channel_id       TEXT NOT NULL DEFAULT '',
      channel_name     TEXT NOT NULL DEFAULT '',
      message_id       TEXT NOT NULL UNIQUE,
      thread_id        TEXT,
      nom              TEXT,
      prenom           TEXT,
      poste            TEXT,
      entreprise       TEXT,
      id_employe       TEXT,
      perso            TEXT,
      compte           TEXT,
      date_debut       TEXT,
      date_fin         TEXT,
      salaire          TEXT,
      adresse          TEXT,
      telephone        TEXT,
      email            TEXT,
      notes            TEXT,
      photo_url        TEXT,
      raw_content      TEXT,
      statut           TEXT DEFAULT 'actif',
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrations pour DB existante
  for (const col of ['id_employe','perso','compte','photo_url','thread_id']) {
    await pool.query(`ALTER TABLE interim_profiles ADD COLUMN IF NOT EXISTS ${col} TEXT`).catch(() => {});
  }

  console.log('✅ PostgreSQL prêt');
}

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  prepare: (sql) => ({
    run:  async (...p) => { await pool.query(toPg(sql), p); },
    get:  async (...p) => { const r = await pool.query(toPg(sql), p); return r.rows[0] || null; },
    all:  async (...p) => { const r = await pool.query(toPg(sql), p); return r.rows; },
  }),
  exec: async (sql) => { await pool.query(sql); },
  init,
  save: () => {},
  pool,
};

module.exports = db;
