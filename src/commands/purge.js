/**
 * !purge — Supprime tous les messages du bot dans la catégorie intérimaire
 * Accès : mods/admins + IDs autorisés
 */
const { ChannelType } = require('discord.js');
const { isAllowed } = require('../permissions');

const INTERIM_CATEGORY_ID = process.env.INTERIM_FORUM_ID || '1498709065558134875';

module.exports = {
  name: 'purge',
  async execute(message, args, client) {
    if (!isAllowed(message.member)) return;

    const guild = message.guild;
    const statusMsg = await message.channel.send('🧹 Suppression des messages du bot en cours...').catch(() => null);

    try {
      await guild.channels.fetch();

      // Tous les salons de la catégorie intérimaire
      const channels = guild.channels.cache.filter(c =>
        c.parentId === INTERIM_CATEGORY_ID
      );

      let deleted = 0;

      for (const channel of channels.values()) {
        try {
          // Supprimer dans le salon principal
          await deleteBotMsgs(channel, client.user.id);

          // Supprimer dans tous les threads du salon
          const active   = await channel.threads?.fetchActive().catch(() => null);
          const archived = await channel.threads?.fetchArchived({ limit: 100 }).catch(() => null);

          const threads = [
            ...(active?.threads?.values()   || []),
            ...(archived?.threads?.values() || [])
          ];

          for (const thread of threads) {
            const count = await deleteBotMsgs(thread, client.user.id);
            deleted += count;
          }
        } catch (e) {
          console.error(`[PURGE] Erreur salon "${channel.name}" :`, e.message);
        }
      }

      await statusMsg?.delete().catch(() => {});
      const done = await message.channel.send(`✅ ${deleted} message(s) du bot supprimé(s).`).catch(() => null);
      if (done) setTimeout(() => done.delete().catch(() => {}), 5000);

    } catch (e) {
      console.error('[PURGE] Erreur :', e.message);
      await statusMsg?.delete().catch(() => {});
      const err = await message.channel.send(`❌ Erreur : ${e.message}`).catch(() => null);
      if (err) setTimeout(() => err.delete().catch(() => {}), 5000);
    }
  }
};

async function deleteBotMsgs(channel, botUserId) {
  let count = 0;
  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return 0;
    const botMsgs = messages.filter(m => m.author.id === botUserId);
    for (const msg of botMsgs.values()) {
      await msg.delete().catch(() => {});
      await new Promise(r => setTimeout(r, 200));
      count++;
    }
  } catch (e) {}
  return count;
}
