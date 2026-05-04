/**
 * contractParser.js
 * Parse les posts du forum intérimaire Elite Corp.
 *
 * Format attendu (texte libre ligne par ligne) :
 *   Ligne 1 : Prénom Nom RP  (ex: "Ali Baba")
 *   Ligne 2 : Entreprise     (ex: "penny's Elite sécurité")
 *   Ligne 3 : Société        (ex: "Elite Corp.")
 *   ID Employé: 43011
 *   Perso: 480-5934
 *   Compte: #5631
 *
 * Supporte aussi le format clé: valeur classique.
 */

function extract(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(new RegExp(pattern, 'im'));
    if (match && match[1]) return match[1].trim().replace(/\*\*/g, '').replace(/`/g, '').trim();
  }
  return null;
}

function parseContractMessage(content, threadTitle = null) {
  const text = (content || '').trim();
  if (!text) return { poste: threadTitle || '' };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const profile = {
    nom:        null,
    prenom:     null,
    poste:      null,
    entreprise: null,
    id_employe: null,
    perso:      null,
    compte:     null,
    date_debut: null,
    date_fin:   null,
    salaire:    null,
    adresse:    null,
    telephone:  null,
    email:      null,
    notes:      null
  };

  // ── Extraction clé: valeur (priorité) ──────────────────────────────────────
  profile.nom        = extract(text, ['nom\\s*[:\\-]\\s*(.+)', 'last.?name\\s*[:\\-]\\s*(.+)']);
  profile.prenom     = extract(text, ['pr[eé]nom\\s*[:\\-]\\s*(.+)', 'first.?name\\s*[:\\-]\\s*(.+)']);
  profile.poste      = extract(text, ['poste\\s*[:\\-]\\s*(.+)', 'fonction\\s*[:\\-]\\s*(.+)', 'job\\s*[:\\-]\\s*(.+)', 'titre\\s*[:\\-]\\s*(.+)', 'mission\\s*[:\\-]\\s*(.+)']);
  profile.entreprise = extract(text, ['entreprise\\s*[:\\-]\\s*(.+)', 'soci[eé]t[eé]\\s*[:\\-]\\s*(.+)', 'company\\s*[:\\-]\\s*(.+)', 'employeur\\s*[:\\-]\\s*(.+)']);
  profile.id_employe = extract(text, ['id\\s*employ[eé]\\s*[:\\-]\\s*(.+)', 'id\\s*employ[eé]\\s*:\\s*(.+)', 'id\\s*[:\\-]\\s*(\\d+)', 'matricule\\s*[:\\-]\\s*(.+)', 'employ[eé]\\s*[:\\-]\\s*(\\d+)']);
  profile.perso      = extract(text, ['perso\\s*[:\\-]\\s*(.+)', 'personnage\\s*[:\\-]\\s*(.+)']);
  profile.compte     = extract(text, ['compte\\s*[:\\-]\\s*(.+)', '#\\s*(\\d+)']);
  profile.salaire    = extract(text, ['salaire\\s*[:\\-]\\s*(.+)', 'r[eé]mun[eé]ration\\s*[:\\-]\\s*(.+)', 'taux\\s*[:\\-]\\s*(.+)']);
  profile.telephone  = extract(text, ['t[eé]l[eé]phone?\\s*[:\\-]\\s*(.+)', 'tel\\s*[:\\-]\\s*(.+)', 'mobile\\s*[:\\-]\\s*(.+)']);
  profile.email      = extract(text, ['e.?mail\\s*[:\\-]\\s*(.+)', '([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})']);
  profile.date_debut = extract(text, ['d[eé]but\\s*[:\\-]\\s*(.+)', 'date.?d[eé]but\\s*[:\\-]\\s*(.+)']);
  profile.date_fin   = extract(text, ['fin\\s*[:\\-]\\s*(.+)', 'date.?fin\\s*[:\\-]\\s*(.+)']);
  profile.notes      = extract(text, ['notes?\\s*[:\\-]\\s*(.+)', 'remarques?\\s*[:\\-]\\s*(.+)']);

  // ── Fallback texte libre ligne par ligne ────────────────────────────────────
  // Filtrer les lignes qui ne sont pas des clé:valeur
  const freeLines = lines.filter(l => !l.match(/^[\w\s]+\s*[:\-]/));

  // Ligne 1 libre = nom complet RP (si pas trouvé via clé:valeur)
  if (!profile.nom && !profile.prenom && freeLines.length > 0) {
    const fullName = freeLines[0].trim();
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      profile.prenom = parts[0];
      profile.nom    = parts.slice(1).join(' ');
    } else {
      profile.nom = fullName;
    }
  }

  // Ligne 2 libre = entreprise (si pas trouvé)
  if (!profile.entreprise && freeLines.length > 1) {
    profile.entreprise = freeLines[1].trim();
  }

  // Titre du thread = poste (si pas trouvé dans le contenu)
  if (!profile.poste && threadTitle) {
    profile.poste = threadTitle.substring(0, 200);
  }

  // Nettoyer les valeurs trop longues
  for (const key of Object.keys(profile)) {
    if (profile[key] && profile[key].length > 200) profile[key] = profile[key].substring(0, 200);
  }

  return profile;
}

module.exports = { parseContractMessage };
