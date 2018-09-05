// Packages import
const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');

// Modules import
const command = require('./data/common/command');
const config = require('./server/config.json');
const raidMembersFunctions = require('./server/raid/raid-member');
const raidCalendarFunctions = require('./server/raid/raid-calendar');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = config.loggerLevel;

// Initialize Discord Bot
let bot = new Discord.Client({
  token: auth.token,
  autorun: true
});
bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
  // Our bot needs to know if it will execute a command
  // It will listen for messages that will start with `!`
  if (message.substring(0, 1) == '!') {
    let args = message.substring(1).split(' ');
    let cmd = args[0];
    
    args = args.splice(1);
    switch(cmd) {
      // !ping
      case 'ping':
        bot.sendMessage({
            to: channelID,
            message: 'Pong !'
        });
      break;            
      // !raid-status-show
      case command.raidStatusShow.name:
      case command.raidStatusShow.alias:
        raidMembersFunctions.raidStatus('show')
          .then(result => {
            bot.sendMessage({
              to: channelID,
              message: "<@!" + userID + "> Voici le récapitulatif des membres du raid" + result
            });
          }); 
      break;
      // !raid-status-update
      case command.raidStatusUpdate.name:
      case command.raidStatusUpdate.alias:              
        raidMembersFunctions.raidStatus('update', bot, channelID)
          .then(response => {
            bot.sendMessage({
              to: channelID,
              message: '<@!' + userID + '> ' + response.message
            });
          }); 
      break;
      // !raid-member-add
      case command.raidMemberAdd.name:
      case command.raidMemberAdd.alias:
        bot.sendMessage({
          to: channelID,
          message: raidMembersFunctions.raidMembers('add', args)
        });
      break;
      // !raid-member-update
      case command.raidMemberUpdate.name:    
      case command.raidMemberUpdate.alias:
        raidMembersFunctions.raidMembersUpdate(args)
          .then(response => {
            bot.sendMessage({
              to: channelID,
              message: response
            });
          });
      break;
      // !raid-member-remove
      case command.raidMemberRemove.name:
      case command.raidMemberRemove.alias:
        bot.sendMessage({
          to: channelID,
          message: raidMembersFunctions.raidMembers('remove', args)
        });
      break;
      // !raid-member-set-role
      case command.raidMemberSetRole.name:
      case command.raidMemberSetRole.alias:
        bot.sendMessage({
          to: channelID,
          message: raidMembersFunctions.raidMembers('set-role', args)
        });
      break;
      // !raid-member-set-class
      case command.raidMemberSetClass.name:
      case command.raidMemberSetClass.alias:
        bot.sendMessage({
          to: channelID,
          message: raidMembersFunctions.raidMembers('set-class', args)
        });
      break;
      // !raid-member-set-realm
      case command.raidMemberSetRealm.name:
      case command.raidMemberSetRealm.alias:
        bot.sendMessage({
          to: channelID,
          message: raidMembersFunctions.raidMembers('set-realm', args)
        });
      break;
      // !raid-event-next
      case command.raidEventNext.name:
      case command.raidEventNext.alias:
        raidCalendarFunctions.raidEventNext()
          .then(result => {
            bot.sendMessage({
              to: channelID,
              message: result
            });
          });
      break;
      // !raidEventMonth
      case command.raidEventMonth.name:
      case command.raidEventMonth.alias:
        raidCalendarFunctions.raidEventMonth()
          .then(result => {
            bot.sendMessage({
              to: channelID,
              message: result
            });
          });
      break;
      // !raidEventForMonth
      case command.raidEventForMonth.name:
      case command.raidEventForMonth.alias:
        bot.sendMessage({
          to: channelID,
          message: raidCalendarFunctions.raidEventForMonth(args)
        });
      break;
    }
  }
});