/**
 * interimManager.js — Gestion des profils intérimaires en DB.
 * Anti-doublon : ON CONFLICT (message_id).
 */

const db = require('./database');

async function upsertProfile({ discordUserId, discordUsername, guildId, channelId, channelName, messageId, threadId = null, profile, rawContent, photoUrl = null }) {
  const { pool } = db;
  await pool.query(`
    INSERT INTO interim_profiles (
      discord_user_id,discord_username,guild_id,channel_id,channel_name,
      message_id,thread_id,nom,prenom,poste,entreprise,id_employe,perso,compte,
      date_debut,date_fin,salaire,adresse,telephone,email,notes,photo_url,raw_content,statut,updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'actif',NOW())
    ON CONFLICT (message_id) DO UPDATE SET
      discord_username=EXCLUDED.discord_username,
      thread_id  =COALESCE(EXCLUDED.thread_id,  interim_profiles.thread_id),
      nom        =COALESCE(EXCLUDED.nom,        interim_profiles.nom),
      prenom     =COALESCE(EXCLUDED.prenom,     interim_profiles.prenom),
      poste      =COALESCE(EXCLUDED.poste,      interim_profiles.poste),
      entreprise =COALESCE(EXCLUDED.entreprise, interim_profiles.entreprise),
      id_employe =COALESCE(EXCLUDED.id_employe, interim_profiles.id_employe),
      perso      =COALESCE(EXCLUDED.perso,      interim_profiles.perso),
      compte     =COALESCE(EXCLUDED.compte,     interim_profiles.compte),
      date_debut =COALESCE(EXCLUDED.date_debut, interim_profiles.date_debut),
      date_fin   =COALESCE(EXCLUDED.date_fin,   interim_profiles.date_fin),
      salaire    =COALESCE(EXCLUDED.salaire,    interim_profiles.salaire),
      adresse    =COALESCE(EXCLUDED.adresse,    interim_profiles.adresse),
      telephone  =COALESCE(EXCLUDED.telephone,  interim_profiles.telephone),
      email      =COALESCE(EXCLUDED.email,      interim_profiles.email),
      notes      =COALESCE(EXCLUDED.notes,      interim_profiles.notes),
      photo_url  =COALESCE(EXCLUDED.photo_url,  interim_profiles.photo_url),
      raw_content=EXCLUDED.raw_content,
      updated_at =NOW()
  `, [
    discordUserId, discordUsername, guildId, channelId, channelName,
    messageId, threadId,
    profile.nom, profile.prenom, profile.poste, profile.entreprise,
    profile.id_employe, profile.perso, profile.compte,
    profile.date_debut, profile.date_fin, profile.salaire, profile.adresse,
    profile.telephone, profile.email, profile.notes,
    photoUrl, rawContent
  ]);
}

async function getProfiles(guildId, { statut = null, limit = 50, offset = 0 } = {}) {
  const { pool } = db;
  const params = [guildId];
  let where = 'WHERE guild_id = $1';
  if (statut) { params.push(statut); where += ` AND statut = $${params.length}`; }
  params.push(limit, offset);
  const r = await pool.query(
    `SELECT * FROM interim_profiles ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  return r.rows;
}

async function getProfileByUser(discordUserId, guildId) {
  const { pool } = db;
  const r = await pool.query(
    `SELECT * FROM interim_profiles WHERE discord_user_id = $1 AND guild_id = $2 ORDER BY updated_at DESC LIMIT 1`,
    [discordUserId, guildId]
  );
  return r.rows[0] || null;
}

async function getProfileByThread(threadId) {
  const { pool } = db;
  const r = await pool.query(
    `SELECT * FROM interim_profiles WHERE thread_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [threadId]
  );
  return r.rows[0] || null;
}

async function updateStatus(messageId, statut) {
  const { pool } = db;
  await pool.query(`UPDATE interim_profiles SET statut=$1, updated_at=NOW() WHERE message_id=$2`, [statut, messageId]);
}

async function deleteProfile(messageId) {
  const { pool } = db;
  await pool.query(`DELETE FROM interim_profiles WHERE message_id=$1`, [messageId]);
}

async function countProfiles(guildId, statut = null) {
  const { pool } = db;
  const params = [guildId];
  let where = 'WHERE guild_id = $1';
  if (statut) { params.push(statut); where += ` AND statut = $2`; }
  const r = await pool.query(`SELECT COUNT(*) as c FROM interim_profiles ${where}`, params);
  return parseInt(r.rows[0]?.c || 0);
}

async function searchProfiles(guildId, query) {
  const { pool } = db;
  const q = `%${query}%`;
  const r = await pool.query(`
    SELECT * FROM interim_profiles
    WHERE guild_id=$1 AND (nom ILIKE $2 OR prenom ILIKE $2 OR poste ILIKE $2
      OR entreprise ILIKE $2 OR id_employe ILIKE $2 OR perso ILIKE $2 OR compte ILIKE $2)
    ORDER BY updated_at DESC LIMIT 20
  `, [guildId, q]);
  return r.rows;
}

module.exports = { upsertProfile, getProfiles, getProfileByUser, getProfileByThread, updateStatus, deleteProfile, countProfiles, searchProfiles };
