require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const db = require('./src/database');

// Healthcheck IMMEDIAT — repond avant meme que la DB soit prete
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
}).listen(PORT, '0.0.0.0', () => {
  console.log('Healthcheck OK sur port ' + PORT);
});

async function main() {
  // Init DB avec retry
  for (let i = 0; i < 5; i++) {
    try {
      await db.init();
      console.log('DB OK');
      break;
    } catch (e) {
      console.log('DB tentative ' + (i+1) + '/5 : ' + e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.ThreadMember],
  });

  client.commands = new Collection();

  const commandsPath = path.join(__dirname, 'src', 'commands');
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.name) {
      client.commands.set(cmd.name, cmd);
      console.log('Commande : !' + cmd.name);
    }
  }

  const eventsPath = path.join(__dirname, 'src', 'events');
  for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const exported = require(path.join(eventsPath, file));
    const events = Array.isArray(exported) ? exported : [exported];
    for (const event of events) {
      if (!event.name) continue;
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log('Event : ' + event.name);
    }
  }

  await client.login(process.env.BOT_TOKEN);
  console.log('Bot connecte');
}

main().catch(err => {
  console.error('Erreur fatale : ' + err.message);
  process.exit(1);
});
