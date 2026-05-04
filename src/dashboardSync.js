/**
 * dashboardSync.js
 * Sync profils intérimaires vers le site Elite Corp.
 * Route cible : POST /api/dossiers-rh/interimaire
 * Anti-doublon : vérifie par id_employe avant de créer.
 */

const ELITE_CORP_URL = (process.env.DASHBOARD_URL || 'https://sitegestion.sliplane.app').replace(/\/$/, '');
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN || 'reoxitof_le_goat';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-bot-token': BOT_TOKEN
  };
}

/**
 * Envoie un profil intérimaire vers le site Elite Corp.
 * Utilise id_employe comme clé d'unicité si disponible.
 */
async function syncProfile(data) {
  if (!ELITE_CORP_URL) return;

  try {
    const headers = getHeaders();

    // Vérifier si un dossier avec cet id_employe existe déjà
    if (data.id_employe) {
      const check = await fetch(`${ELITE_CORP_URL}/api/dossiers-rh`, {
        headers, signal: AbortSignal.timeout(8000)
      }).catch(() => null);

      if (check?.ok) {
        const dossiers = await check.json().catch(() => []);
        const existing = dossiers.find(d => d.id_employe === String(data.id_employe));
        if (existing) {
          // Mettre à jour
          await fetch(`${ELITE_CORP_URL}/api/dossiers-rh/${existing.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              perso:      data.perso      || existing.perso      || '',
              compte:     data.compte     || existing.compte     || '',
              id_employe: data.id_employe || existing.id_employe || '',
              division:   data.entreprise || existing.division   || '',
            }),
            signal: AbortSignal.timeout(8000)
          }).catch(() => null);
          console.log(`[SYNC] Dossier mis à jour — ID ${data.id_employe}`);
          return;
        }
      }
    }

    // Créer un nouveau dossier intérimaire
    const body = {
      nom:        data.nom        || '',
      prenom:     data.prenom     || '',
      poste:      data.poste      || '',
      perso:      data.perso      || '',
      compte:     data.compte     || '',
      id_employe: data.id_employe || '',
      division:   data.entreprise || data.channelName || '',
      role:       'interimaire'
    };

    // Vérifier qu'on a les champs obligatoires
    if (!body.nom || !body.prenom || !body.id_employe || !body.division) {
      console.log(`[SYNC] Champs manquants — nom:${body.nom} prenom:${body.prenom} id:${body.id_employe} div:${body.division}`);
      return;
    }

    const res = await fetch(`${ELITE_CORP_URL}/api/dossiers-rh/interimaire`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    }).catch(() => null);

    if (res?.ok) {
      console.log(`[SYNC] Dossier créé — ${body.prenom} ${body.nom}`);
    } else if (res) {
      const err = await res.text().catch(() => '');
      console.log(`[SYNC] Erreur ${res.status}: ${err.substring(0, 200)}`);
    }
  } catch (e) {
    console.log('[SYNC] Erreur :', e.message);
  }
}

module.exports = { syncProfile };
