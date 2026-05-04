/**
 * dashboardSync.js
 * Sync profils intérimaires vers le site Elite Corp.
 * Route cible : POST /api/dossiers-rh/interimaire
 * Anti-doublon : vérifie par id_employe, puis par nom+prenom comme fallback.
 */

const ELITE_CORP_URL = (process.env.DASHBOARD_URL || 'https://sitegestion.sliplane.app').replace(/\/$/, '');
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN || 'reoxitof_le_goat';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-bot-token': BOT_TOKEN
  };
}

// Cache local des dossiers pour éviter de refetch à chaque appel
let _dossiersCache = null;
let _dossiersCacheTime = 0;

async function fetchDossiers() {
  // Cache 30 secondes
  if (_dossiersCache && Date.now() - _dossiersCacheTime < 30000) return _dossiersCache;

  const res = await fetch(`${ELITE_CORP_URL}/api/dossiers-rh`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(8000)
  }).catch(() => null);

  if (res?.ok) {
    _dossiersCache = await res.json().catch(() => []);
    _dossiersCacheTime = Date.now();
    return _dossiersCache;
  }
  return [];
}

function invalidateCache() {
  _dossiersCache = null;
  _dossiersCacheTime = 0;
}

/**
 * Trouve un dossier existant par id_employe ou par nom+prenom (fallback)
 */
function findExisting(dossiers, data) {
  // 1. Par id_employe (priorité)
  if (data.id_employe) {
    const found = dossiers.find(d =>
      d.id_employe && d.id_employe.trim().toLowerCase() === String(data.id_employe).trim().toLowerCase()
    );
    if (found) return found;
  }

  // 2. Fallback : par nom + prenom
  if (data.nom && data.prenom) {
    const nom    = data.nom.trim().toLowerCase();
    const prenom = data.prenom.trim().toLowerCase();
    const found = dossiers.find(d => {
      const dNom    = (d.nom    || d.nom_libre    || '').trim().toLowerCase();
      const dPrenom = (d.prenom || d.prenom_libre || '').trim().toLowerCase();
      return dNom === nom && dPrenom === prenom;
    });
    if (found) return found;
  }

  return null;
}

/**
 * Envoie un profil intérimaire vers le site Elite Corp.
 */
async function syncProfile(data) {
  if (!ELITE_CORP_URL) return;

  try {
    const headers = getHeaders();
    const dossiers = await fetchDossiers();
    const existing = findExisting(dossiers, data);

    if (existing) {
      // Mettre à jour le dossier existant
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

      invalidateCache();
      console.log(`[SYNC] Dossier mis à jour — ${data.prenom} ${data.nom} (ID: ${existing.id})`);
      return;
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

    if (!body.nom || !body.prenom || !body.id_employe || !body.division) {
      // Essayer quand même si on a au moins id_employe OU nom+prenom
      if (!body.id_employe && (!body.nom || !body.prenom)) {
        console.log(`[SYNC] Champs insuffisants — nom:${body.nom} prenom:${body.prenom} id:${body.id_employe} div:${body.division}`);
        return;
      }
      // Mettre une valeur par défaut pour division si manquante
      if (!body.division) body.division = 'Non défini';
    }

    const res = await fetch(`${ELITE_CORP_URL}/api/dossiers-rh/interimaire`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    }).catch(() => null);

    if (res?.ok) {
      invalidateCache();
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
