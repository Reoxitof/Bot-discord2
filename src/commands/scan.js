/**
 * !scan — Scanne tous les forums de la catégorie Intérimaire,
 * lit le titre (= métier/poste) + contenu de chaque post,
 * pousse vers le site Elite Corp, et supprime les messages du bot.
 * Accès : mods/admins + IDs autorisés
 */
const { EmbedBuilder, ChannelType } = require('discord.js');
const { parseContractMessage } = require('../contractParser');
const { syncProfile } = require('../dashboardSync');
const { isAllowed } = require('../permissions');

// IDs des catégories à scanner
const CATEGORY_IDS = [
  process.env.INTERIM_FORUM_ID || '1498709065558134875', // Intérimaire
  '1497973953011122456'                                   // Deuxième catégorie
];

module.exports = {
  name: 'scan',
  async execute(message, args, client) {
    if (!isAllowed(message.member)) return;

    const guild = message.guild;

    // Message de statut — sera supprimé à la fin
    const statusMsg = await message.channel.send('🔍 Scan des forums intérimaires en cours...').catch(() => null);

    try {
      // Fetch tous les salons
      await guild.channels.fetch();

      // Tous les salons dans les catégories à scanner (forum + texte)
      const channelsInCategory = guild.channels.cache.filter(c =>
        CATEGORY_IDS.includes(c.parentId) && (
          c.type === ChannelType.GuildForum ||
          c.type === ChannelType.GuildText  ||
          c.type === ChannelType.GuildAnnouncement
        )
      );

      let forumsToScan = [...channelsInCategory.values()];

      // Fallback : tous les forums du serveur si catégories vides
      if (!forumsToScan.length) {
        forumsToScan = [...guild.channels.cache.filter(c =>
          c.type === ChannelType.GuildForum
        ).values()];
      }

      if (!forumsToScan.length) {
        await statusMsg?.delete().catch(() => {});
        return message.channel.send('❌ Aucun salon trouvé dans les catégories.').then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        }).catch(() => {});
      }

      let totalOk = 0;
      let totalSkip = 0;
      let totalErrors = 0;
      let totalThreads = 0;

      for (const forum of forumsToScan) {
        try {
          // Récupérer threads actifs + archivés
          const active   = await forum.threads?.fetchActive().catch(() => null);
          const archived = await forum.threads?.fetchArchived({ limit: 100 }).catch(() => null);

          const threads = [
            ...(active?.threads?.values()   || []),
            ...(archived?.threads?.values() || [])
          ];

          totalThreads += threads.length;

          for (const thread of threads) {
            try {
              // Récupérer le message initial du post
              const starter = await thread.fetchStarterMessage().catch(() => null);
              if (!starter) { totalSkip++; continue; }

              // Supprimer les messages du bot dans ce thread
              await deleteBotMessages(thread, client.user.id);

              const content = starter.content.trim();

              // Titre du post = poste/métier
              const threadTitle = thread.name;

              // Parser le contenu + titre comme poste
              const profile = parseContractMessage(content, threadTitle) || { poste: threadTitle };

              // Ignorer si pas assez d'infos pour créer un dossier
              if (!profile.id_employe && (!profile.nom || !profile.prenom)) {
                totalSkip++;
                continue;
              }

              // Photo si présente
              const photoUrl = starter.attachments?.find(a =>
                a.contentType?.startsWith('image/') ||
                /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || '')
              )?.url || null;

              // Envoyer vers Elite Corp
              const sent = await syncProfile({
                messageId:       starter.id,
                threadId:        thread.id,
                discordUserId:   starter.author.id,
                discordUsername: starter.author.tag,
                guildId:         guild.id,
                channelId:       forum.id,
                channelName:     thread.name,
                ...profile,
                photoUrl,
                rawContent: content.substring(0, 2000)
              });

              totalOk++;
              await new Promise(r => setTimeout(r, 300));

            } catch (e) {
              console.error(`[SCAN] Erreur thread "${thread.name}" :`, e.message);
              totalErrors++;
            }
          }
        } catch (e) {
          console.error(`[SCAN] Erreur forum "${forum.name}" :`, e.message);
        }
      }

      // Supprimer le message de statut
      await statusMsg?.delete().catch(() => {});

      // Envoyer le résumé (auto-supprimé après 15s)
      const embed = new EmbedBuilder()
        .setColor(totalOk > 0 ? 0x57F287 : 0xED4245)
        .setTitle('📊 Scan terminé')
        .addFields(
          { name: '📁 Forums',       value: String(forumsToScan.length), inline: true },
          { name: '🗂️ Posts',        value: String(totalThreads),        inline: true },
          { name: '✅ Envoyés',      value: String(totalOk),             inline: true },
          { name: '⏭️ Ignorés',     value: String(totalSkip),           inline: true },
          { name: '❌ Erreurs',      value: String(totalErrors),         inline: true }
        )
        .setFooter({ text: 'Elite Corp — Dashboard' })
        .setTimestamp();

      const resultMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
      if (resultMsg) setTimeout(() => resultMsg.delete().catch(() => {}), 15000);

    } catch (e) {
      console.error('[SCAN] Erreur générale :', e.message);
      await statusMsg?.delete().catch(() => {});
      const errMsg = await message.channel.send(`❌ Erreur : ${e.message}`).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
    }
  }
};

/**
 * Supprime tous les messages du bot dans un thread
 */
async function deleteBotMessages(thread, botUserId) {
  try {
    const messages = await thread.messages.fetch({ limit: 50 }).catch(() => null);
    if (!messages) return;
    const botMessages = messages.filter(m => m.author.id === botUserId);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) {
    // Silencieux
  }
}
