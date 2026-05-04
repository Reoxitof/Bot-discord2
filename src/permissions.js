/**
 * permissions.js
 * Contrôle d'accès aux commandes du bot entreprise.
 * Autorisés : mods/admins (ManageMessages) + IDs spécifiques
 */

// IDs Discord autorisés à utiliser toutes les commandes
const ALLOWED_USER_IDS = [
  '190424192334692353', // Reoxitof
];

/**
 * Vérifie si un membre peut utiliser les commandes du bot
 */
function isAllowed(member) {
  if (!member) return false;
  // ID spécifique
  if (ALLOWED_USER_IDS.includes(member.id)) return true;
  // Permission mod/admin
  if (member.permissions.has('ManageMessages')) return true;
  return false;
}

module.exports = { isAllowed, ALLOWED_USER_IDS };
