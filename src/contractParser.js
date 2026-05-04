/**
 * contractParser.js
 * Parse les messages Discord pour extraire les infos intérimaires.
 */

function extract(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(new RegExp(pattern, 'im'));
    if (match && match[1]) return match[1].trim().replace(/\*\*/g, '').replace(/`/g, '').trim();
  }
  return null;
}

function parseContractMessage(content, threadTitle = null) {
  const text = content || '';

  const profile = {
    nom:        extract(text, ['nom\\s*[:\\-]\\s*(.+)', 'last.?name\\s*[:\\-]\\s*(.+)']),
    prenom:     extract(text, ['pr[eé]nom\\s*[:\\-]\\s*(.+)', 'first.?name\\s*[:\\-]\\s*(.+)']),
    poste:      extract(text, ['poste\\s*[:\\-]\\s*(.+)', 'fonction\\s*[:\\-]\\s*(.+)', 'job\\s*[:\\-]\\s*(.+)', 'titre\\s*[:\\-]\\s*(.+)', 'mission\\s*[:\\-]\\s*(.+)']),
    entreprise: extract(text, ['entreprise\\s*[:\\-]\\s*(.+)', 'soci[eé]t[eé]\\s*[:\\-]\\s*(.+)', 'company\\s*[:\\-]\\s*(.+)', 'employeur\\s*[:\\-]\\s*(.+)']),
    date_debut: extract(text, ['d[eé]but\\s*[:\\-]\\s*(.+)', 'date.?d[eé]but\\s*[:\\-]\\s*(.+)']),
    date_fin:   extract(text, ['fin\\s*[:\\-]\\s*(.+)', 'date.?fin\\s*[:\\-]\\s*(.+)']),
    salaire:    extract(text, ['salaire\\s*[:\\-]\\s*(.+)', 'r[eé]mun[eé]ration\\s*[:\\-]\\s*(.+)', 'taux\\s*[:\\-]\\s*(.+)']),
    adresse:    extract(text, ['adresse\\s*[:\\-]\\s*(.+)', 'lieu\\s*[:\\-]\\s*(.+)', 'ville\\s*[:\\-]\\s*(.+)']),
    telephone:  extract(text, ['t[eé]l[eé]phone?\\s*[:\\-]\\s*(.+)', 'tel\\s*[:\\-]\\s*(.+)', 'mobile\\s*[:\\-]\\s*(.+)']),
    email:      extract(text, ['e.?mail\\s*[:\\-]\\s*(.+)', 'mail\\s*[:\\-]\\s*(.+)', '([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})']),
    notes:      extract(text, ['notes?\\s*[:\\-]\\s*(.+)', 'remarques?\\s*[:\\-]\\s*(.+)', 'commentaires?\\s*[:\\-]\\s*(.+)']),
    id_employe: extract(text, ['id\\s*employ[eé]\\s*[:\\-]\\s*(.+)', 'id\\s*[:\\-]\\s*(\\d+)', 'matricule\\s*[:\\-]\\s*(.+)']),
    perso:      extract(text, ['perso\\s*[:\\-]\\s*(.+)', 'personnage\\s*[:\\-]\\s*(.+)']),
    compte:     extract(text, ['compte\\s*[:\\-]\\s*(.+)', '#\\s*(\\d+)'])
  };

  for (const key of Object.keys(profile)) {
    if (profile[key] && profile[key].length > 200) profile[key] = profile[key].substring(0, 200);
  }

  // Titre du thread = poste si non trouvé dans le contenu
  if (!profile.poste && threadTitle) profile.poste = threadTitle.substring(0, 200);

  const filled = Object.values(profile).filter(v => v !== null).length;
  if (filled < 1) return null;

  return profile;
}

module.exports = { parseContractMessage };
