/**
 * !profil [@user] — Affiche le profil intérimaire
 * !profil search <terme> — Recherche
 */
const { EmbedBuilder } = require('discord.js');
const { getProfileByUser, searchProfiles } = require('../interimManager');

module.exports = {
  name: 'profil',
  async execute(message, args, client) {
    if (args[0] === 'search' || args[0] === 'recherche') {
      const query = args.slice(1).join(' ');
      if (!query || query.length < 2) return message.reply('❌ Ex: `!profil search Dupont`');
      const results = await searchProfiles(message.guild.id, query);
      if (!results.length) return message.reply(`❌ Aucun résultat pour **"${query}"**.`);
      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle(`🔍 "${query}"`)
        .setDescription(results.map((p, i) => {
          const name = [p.prenom, p.nom].filter(Boolean).join(' ') || p.discord_username;
          return `**${i+1}.** ${name}${p.poste ? ` — ${p.poste}` : ''}${p.entreprise ? ` @ ${p.entreprise}` : ''}`;
        }).join('\n'))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const target = message.mentions.users.first() || message.author;
    const profile = await getProfileByUser(target.id, message.guild.id);
    if (!profile) return message.reply(`❌ Aucun profil pour **${target.tag}**.`);

    const emoji = { actif: '🟢', inactif: '🔴', en_attente: '🟡' };
    const embed = new EmbedBuilder()
      .setColor(0xc9a84c)
      .setTitle('📋 Profil Intérimaire')
      .setFooter({ text: `Elite Corp • ${target.tag}` })
      .setTimestamp(new Date(profile.updated_at));

    const fields = [];
    if (profile.nom || profile.prenom) fields.push({ name: '👤 Identité', value: [profile.prenom, profile.nom].filter(Boolean).join(' '), inline: true });
    if (profile.poste)      fields.push({ name: '💼 Poste',      value: profile.poste,      inline: true });
    if (profile.entreprise) fields.push({ name: '🏢 Entreprise', value: profile.entreprise, inline: true });
    if (profile.id_employe) fields.push({ name: '🪪 ID Employé', value: profile.id_employe, inline: true });
    if (profile.perso)      fields.push({ name: '📱 Perso',      value: profile.perso,      inline: true });
    if (profile.compte)     fields.push({ name: '🏦 Compte',     value: profile.compte,     inline: true });
    if (profile.salaire)    fields.push({ name: '💰 Salaire',    value: profile.salaire,    inline: true });
    if (profile.telephone)  fields.push({ name: '📞 Téléphone',  value: profile.telephone,  inline: true });
    if (profile.email)      fields.push({ name: '📧 Email',      value: profile.email,      inline: true });
    if (profile.notes)      fields.push({ name: '📝 Notes',      value: profile.notes,      inline: false });
    fields.push({ name: '📊 Statut', value: `${emoji[profile.statut] || '⚪'} ${profile.statut}`, inline: true });

    embed.addFields(fields);
    return message.reply({ embeds: [embed] });
  }
};
