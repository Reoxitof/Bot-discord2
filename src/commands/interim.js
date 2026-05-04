/**
 * !interim — Gestion des profils intérimaires (mod/admin)
 * !interim list [actif|inactif|en_attente]
 * !interim stats
 * !interim statut <message_id> <actif|inactif|en_attente>
 * !interim supprimer <message_id>
 */
const { EmbedBuilder } = require('discord.js');
const { getProfiles, countProfiles, updateStatus, deleteProfile } = require('../interimManager');

module.exports = {
  name: 'interim',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Réservé aux modérateurs.');
    }

    const sub = (args[0] || 'list').toLowerCase();

    if (sub === 'list' || sub === 'liste') {
      const validStatuts = ['actif', 'inactif', 'en_attente'];
      const statut = validStatuts.includes(args[1]) ? args[1] : null;
      const profiles = await getProfiles(message.guild.id, { statut, limit: 15 });

      if (!profiles.length) return message.reply(`📭 Aucun profil${statut ? ` (${statut})` : ''}.`);

      const emoji = { actif: '🟢', inactif: '🔴', en_attente: '🟡' };
      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle(`📋 Profils Intérimaires${statut ? ` — ${statut}` : ''}`)
        .setDescription(profiles.map((p, i) => {
          const name = [p.prenom, p.nom].filter(Boolean).join(' ') || p.discord_username;
          return `${emoji[p.statut] || '⚪'} **${i+1}.** ${name}${p.poste ? ` — ${p.poste}` : ''}${p.entreprise ? ` @ ${p.entreprise}` : ''}`;
        }).join('\n'))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'stats') {
      const [total, actifs, inactifs, enAttente] = await Promise.all([
        countProfiles(message.guild.id),
        countProfiles(message.guild.id, 'actif'),
        countProfiles(message.guild.id, 'inactif'),
        countProfiles(message.guild.id, 'en_attente')
      ]);
      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle('📊 Statistiques')
        .addFields(
          { name: '📁 Total',      value: String(total),     inline: true },
          { name: '🟢 Actifs',     value: String(actifs),    inline: true },
          { name: '🔴 Inactifs',   value: String(inactifs),  inline: true },
          { name: '🟡 En attente', value: String(enAttente), inline: true }
        ).setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'statut' || sub === 'status') {
      const [, id, newStatut] = args;
      if (!id || !newStatut) return message.reply('❌ Usage : `!interim statut <id> <actif|inactif|en_attente>`');
      if (!['actif','inactif','en_attente'].includes(newStatut)) return message.reply('❌ Statut invalide.');
      await updateStatus(id, newStatut);
      return message.reply(`✅ Statut → **${newStatut}**`);
    }

    if (sub === 'supprimer' || sub === 'delete') {
      const id = args[1];
      if (!id) return message.reply('❌ Usage : `!interim supprimer <id>`');
      const confirm = await message.reply(`⚠️ Confirme avec **oui** dans 15s pour supprimer \`${id}\``);
      const collector = message.channel.createMessageCollector({
        filter: m => m.author.id === message.author.id && m.content.toLowerCase() === 'oui',
        time: 15000, max: 1
      });
      collector.on('collect', async () => { await deleteProfile(id); message.reply('✅ Supprimé.'); });
      collector.on('end', c => { if (!c.size) confirm.edit('❌ Annulé.').catch(() => {}); });
      return;
    }

    return message.reply('❓ Sous-commandes : `list`, `stats`, `statut`, `supprimer`');
  }
};
