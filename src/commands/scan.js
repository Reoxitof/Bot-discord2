/**
 * !scan — Trouve automatiquement tous les forums dans la catégorie intérimaire
 * et pousse les posts vers le site Elite Corp.
 * Accès : mods/admins + IDs autorisés
 */
const { EmbedBuilder, ChannelType } = require('discord.js');
const { parseContractMessage } = require('../contractParser');
const { syncProfile } = require('../dashboardSync');
const { isAllowed } = require('../permissions');

// ID de la catégorie "Intérimaire"
const INTERIM_CATEGORY_ID = process.env.INTERIM_FORUM_ID || '1498709065558134875';

module.exports = {
  name: 'scan',
  async execute(message, args, client) {
    if (!isAllowed(message.member)) return;

    const guild = message.guild;
    const statusMsg = await message.channel.send('🔍 Recherche des forums intérimaires...').catch(() => null);

    try {
      // Fetch tous les salons du serveur
      await guild.channels.fetch();

      // Trouver tous les forums dans la catégorie intérimaire
      const forums = guild.channels.cache.filter(c =>
        c.type === ChannelType.GuildForum && c.parentId === INTERIM_CATEGORY_ID
      );

      // Si aucun forum dans la catégorie, chercher par nom
      let forumsToScan = [...forums.values()];

      if (!forumsToScan.length) {
        // Fallback : chercher tous les forums du serveur avec un nom lié aux intérimaires
        const allForums = guild.channels.cache.filter(c =>
          c.type === ChannelType.GuildForum
        );
        forumsToScan = [...allForums.values()];
      }

      if (!forumsToScan.length) {
        return statusMsg?.edit('❌ Aucun salon Forum trouvé sur ce serveur.').catch(() => {});
      }

      await statusMsg?.edit(`🔍 ${forumsToScan.length} forum(s) trouvé(s) — scan en cours...`).catch(() => {});

      let totalOk = 0;
      let totalSkip = 0;
      let totalErrors = 0;
      let totalThreads = 0;

      for (const forum of forumsToScan) {
        try {
          // Threads actifs
          const active = await forum.threads.fetchActive().catch(() => null);
          const archived = await forum.threads.fetchArchived({ limit: 100 }).catch(() => null);

          const threads = [
            ...(active?.threads?.values() || []),
            ...(archived?.threads?.values() || [])
          ];

          totalThreads += threads.length;

          for (const thread of threads) {
            try {
              const starter = await thread.fetchStarterMessage().catch(() => null);
              if (!starter) { totalSkip++; continue; }

              const content = starter.content.trim();
              const profile = parseContractMessage(content, thread.name) || { poste: thread.name };

              const photoUrl = starter.attachments?.find(a =>
                a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || '')
              )?.url || null;

              await syncProfile({
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
              await new Promise(r => setTimeout(r, 500));

            } catch (e) {
              console.error(`[SCAN] Erreur thread "${thread.name}" :`, e.message);
              totalErrors++;
            }
          }
        } catch (e) {
          console.error(`[SCAN] Erreur forum "${forum.name}" :`, e.message);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(totalOk > 0 ? 0x57F287 : 0xED4245)
        .setTitle('📊 Scan terminé')
        .addFields(
          { name: '📁 Forums scannés', value: String(forumsToScan.length), inline: true },
          { name: '🗂️ Posts trouvés',  value: String(totalThreads),        inline: true },
          { name: '✅ Envoyés',        value: String(totalOk),             inline: true },
          { name: '⏭️ Ignorés',       value: String(totalSkip),           inline: true },
          { name: '❌ Erreurs',        value: String(totalErrors),         inline: true }
        )
        .setFooter({ text: 'Elite Corp — Dashboard' })
        .setTimestamp();

      await statusMsg?.edit({ content: '', embeds: [embed] }).catch(() =>
        message.channel.send({ embeds: [embed] }).catch(() => {})
      );

    } catch (e) {
      console.error('[SCAN] Erreur générale :', e.message);
      await statusMsg?.edit(`❌ Erreur : ${e.message}`).catch(() =>
        message.channel.send(`❌ Erreur : ${e.message}`).catch(() => {})
      );
    }
  }
};
