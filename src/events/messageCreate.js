/**
 * messageCreate.js — Écoute les commandes préfixées par !
 */
const { isAllowed } = require('../permissions');

const PREFIX = '!';

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // Vérification permissions
    if (!isAllowed(message.member)) return;

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`Erreur commande !${commandName} :`, err.message);
      message.reply('❌ Une erreur est survenue.').catch(() => {});
    }
  }
};
