/**
 * !scan — Lit tous les posts existants du forum intérimaire
 * et les pousse vers le site Elite Corp.
 * Accès : mods/admins + IDs autorisés
 */
const { EmbedBuilder } = require('discord.js');
const { parseContractMessage } = require('../contractParser');
const { syncProfile } = require('../dashboardSync');
const { isAllowed } = require('../permissions');

const INTERIM_FORUM_ID = process.env.INTERIM_FORUM_ID || '1498709065558134875';

module.exports = {
  name: 'scan',
  async execute(message, args, client) {
    if (!isAllowed(message.member)) return;

    const guild = message.guild;
    const statusMsg = await message.channel.send('🔍 Scan en cours...').catch(() => null);

    try {
      // Fetch le salon forum (pas forcément en cache)
      const forum = await guild.channels.fetch(INTERIM_FORUM_ID).catch(() => null);

      if (!forum) {
        return statusMsg?.edit(`❌ Salon forum introuvable (ID: ${INTERIM_FORUM_ID})`).catch(() => {});
      }

      if (!forum.threads) {
        return statusMsg?.edit(`❌ \`${forum.name}\` n'est pas un salon Forum.`).catch(() => {});
      }

      // Récupérer tous les threads actifs + archivés
      let threads = [];

      const active = await forum.threads.fetchActive().catch(() => null);
      if (active) threads.push(...active.threads.values());

      const archived = await forum.threads.fetchArchived({ limit: 100 }).catch(() => null);
      if (archived) threads.push(...archived.threads.values());

      if (!threads.length) {
        return statusMsg?.edit('📭 Aucun post trouvé dans le forum.').catch(() => {});
      }

      let ok = 0;
      let skip = 0;
      let errors = 0;

      for (const thread of threads) {
        try {
          const starter = await thread.fetchStarterMessage().catch(() => null);
          if (!starter) { skip++; continue; }

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

          ok++;
          await new Promise(r => setTimeout(r, 500));

        } catch (e) {
          console.error(`[SCAN] Erreur thread "${thread.name}" :`, e.message);
          errors++;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(ok > 0 ? 0x57F287 : 0xED4245)
        .setTitle('📊 Scan terminé')
        .addFields(
          { name: '✅ Envoyés',  value: String(ok),             inline: true },
          { name: '⏭️ Ignorés', value: String(skip),           inline: true },
          { name: '❌ Erreurs', value: String(errors),          inline: true },
          { name: '📁 Total',   value: String(threads.length),  inline: true }
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
