/**
 * dashboardSync.js — Sync profils vers le dashboard Elite Corp.
 * Anti-doublon : vérifie par message_id avant de créer.
 */

const DASHBOARD_URL = (process.env.DASHBOARD_URL || '').replace(/\/$/, '');
const BOT_INTERNAL_TOKEN = process.env.BOT_INTERNAL_TOKEN || '';

async function syncProfile(data) {
  if (!DASHBOARD_URL) return null;

  const headers = { 'Content-Type': 'application/json' };
  if (BOT_INTERNAL_TOKEN) headers['x-bot-token'] = BOT_INTERNAL_TOKEN;

  try {
    // Vérifier si existe déjà
    const check = await fetch(
      `${DASHBOARD_URL}/interim/profiles/by-message/${encodeURIComponent(data.messageId)}`,
      { headers, signal: AbortSignal.timeout(8000) }
    ).catch(() => null);

    if (check?.ok) {
      const existing = await check.json().catch(() => null);
      if (existing?.profile) {
        // Mettre à jour
        await fetch(`${DASHBOARD_URL}/interim/profiles/${existing.profile.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(8000)
        }).catch(() => null);
        console.log(`[SYNC] Profil mis à jour — ${data.messageId}`);
        return;
      }
    }

    // Créer
    const res = await fetch(`${DASHBOARD_URL}/interim/profiles`, {
      method: 'POST', headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000)
    }).catch(() => null);

    if (res?.ok) console.log(`[SYNC] Profil créé — ${data.nom || data.prenom || data.messageId}`);
    else if (res) console.log(`[SYNC] Erreur ${res.status}`);
  } catch (e) {
    console.log('[SYNC] Erreur :', e.message);
  }
}

module.exports = { syncProfile };
