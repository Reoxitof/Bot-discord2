/**
 * interimThread.js
 * Surveille le salon Forum intérimaire (INTERIM_FORUM_ID).
 * - threadCreate  : nouveau post → parse + sauvegarde + sync dashboard
 * - messageCreate : message dans un thread → enrichit le profil existant
 */

const { EmbedBuilder } = require('discord.js');
const { parseContractMessage } = require('../contractParser');
const { upsertProfile, getProfileByThread } = require('../interimManager');
const { syncProfile } = require('../dashboardSync');

const INTERIM_FORUM_ID = process.env.INTERIM_FORUM_ID || '1498709065558134875';

module.exports = [
  // ── Nouveau post dans le forum ──────────────────────────────────────────────
  {
    name: 'threadCreate',
    async execute(thread, newlyCreated, client) {
      if (!newlyCreated) return;
      if (thread.parentId !== INTERIM_FORUM_ID) return;

      console.log(`[INTERIM] Nouveau post : "${thread.name}"`);

      try {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (!starter) return;

        const content = starter.content.trim();
        const profile = parseContractMessage(content, thread.name) || { poste: thread.name };
        const photoUrl = extractPhoto(starter);

        await upsertProfile({
          discordUserId:   starter.author.id,
          discordUsername: starter.author.tag,
          guildId:         thread.guild.id,
          channelId:       thread.parentId,
          channelName:     thread.name,
          messageId:       starter.id,
          threadId:        thread.id,
          profile, rawContent: content.substring(0, 2000), photoUrl
        });

        await syncProfile({
          messageId: starter.id, threadId: thread.id,
          discordUserId: starter.author.id, discordUsername: starter.author.tag,
          guildId: thread.guild.id, channelId: thread.parentId, channelName: thread.name,
          ...profile, photoUrl, rawContent: content.substring(0, 2000)
        });

        const embed = buildEmbed(profile, starter.author, thread.name, photoUrl);
        await thread.send({ embeds: [embed] }).catch(() => {});

      } catch (e) {
        console.error('[INTERIM] threadCreate error:', e.message);
      }
    }
  },

  // ── Message dans un thread du forum ────────────────────────────────────────
  {
    name: 'messageCreate',
    async execute(message, client) {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.channel.isThread()) return;
      if (message.channel.parentId !== INTERIM_FORUM_ID) return;

      const content = message.content.trim();
      if (content.length < 5) return;

      try {
        const existing = await getProfileByThread(message.channel.id);
        if (!existing) return;

        const newData = parseContractMessage(content, message.channel.name);
        if (!newData) return;

        const photoUrl = extractPhoto(message);

        await upsertProfile({
          discordUserId:   message.author.id,
          discordUsername: message.author.tag,
          guildId:         message.guild.id,
          channelId:       message.channel.parentId,
          channelName:     message.channel.name,
          messageId:       existing.message_id,
          threadId:        message.channel.id,
          profile: newData, rawContent: content.substring(0, 2000), photoUrl
        });

        await syncProfile({
          messageId: existing.message_id, threadId: message.channel.id,
          discordUserId: message.author.id, discordUsername: message.author.tag,
          guildId: message.guild.id, channelId: message.channel.parentId, channelName: message.channel.name,
          ...newData, photoUrl, rawContent: content.substring(0, 2000)
        });

        console.log(`[INTERIM] Profil enrichi — "${message.channel.name}"`);
      } catch (e) {
        console.error('[INTERIM] messageCreate error:', e.message);
      }
    }
  }
];

function extractPhoto(message) {
  const att = message.attachments?.find(a => a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || ''));
  if (att) return att.url;
  const emb = message.embeds?.find(e => e.image || e.thumbnail);
  if (emb) return emb.image?.url || emb.thumbnail?.url || null;
  return null;
}

function buildEmbed(profile, author, threadName, photoUrl) {
  const embed = new EmbedBuilder()
    .setColor(0xc9a84c)
    .setTitle('✅ Fiche enregistrée')
    .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (photoUrl) embed.setThumbnail(photoUrl);

  const fields = [];
  if (profile.prenom || profile.nom) fields.push({ name: '👤 Identité RP', value: [profile.prenom, profile.nom].filter(Boolean).join(' '), inline: true });
  if (profile.poste)      fields.push({ name: '💼 Poste',      value: profile.poste,      inline: true });
  if (profile.entreprise) fields.push({ name: '🏢 Entreprise', value: profile.entreprise, inline: true });
  if (profile.id_employe) fields.push({ name: '🪪 ID Employé', value: profile.id_employe, inline: true });
  if (profile.perso)      fields.push({ name: '📱 Perso',      value: profile.perso,      inline: true });
  if (profile.compte)     fields.push({ name: '🏦 Compte',     value: profile.compte,     inline: true });
  if (!fields.length)     fields.push({ name: '📋 Post',       value: threadName,         inline: false });

  embed.addFields(fields);
  embed.setFooter({ text: 'Elite Corp — Dashboard' });
  return embed;
}
