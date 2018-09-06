// Packages import
const _ = require('lodash');
const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');

// Modules import
const command = require('./data/common/command');
const welcome = require('./data/common/welcome.json');
const utils = require('./server/utils/utils');
const config = require('./server/config.json');
const raidMembersFunctions = require('./server/raid/raid-member');
const raidCalendarFunctions = require('./server/raid/raid-calendar');

// Const for interval message
const START_DATE = '2018-09-06'; // Date used as the starting point for multi-hour intervals, must be YYYY-MM-DD format
const START_HOUR = 9; // Hour of the day when the timer begins (0 is 12am, 23 is 11pm), used with START_DATE and INTERVAL_HOURS param
const INTERVAL_HOURS = 8; // Trigger at an interval of every X hours
const TARGET_MINUTE = 0; // Minute of the hour when the chest will refresh, 30 means 1:30, 2:30, etc.
const OFFSET = 10; // Notification will warn that the target is X minutes away
// Don't change any code below
const NOTIFY_MINUTE = (TARGET_MINUTE < OFFSET ? 60 : 0) + TARGET_MINUTE - OFFSET;
const START_TIME = new Date(new Date(START_DATE).getTime() + new Date().getTimezoneOffset() * 60000 + START_HOUR * 3600000).getTime();

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

  // Set interval to send a reminder message for raid
  let raidChannel = utils.getRaidChannel(bot.channels);
  if (!_.isEmpty(raidChannel)) {
    logger.info(`raidChannel not empty : ${raidChannel.name}`);

    setInterval(function() {
      var d = new Date();
      if(Math.floor((d.getTime() - START_TIME) / 3600000) % INTERVAL_HOURS > 0) return; // Return if hour is not the correct interval
      if(d.getMinutes() !== NOTIFY_MINUTE) return; // Return if current minute is not the notify minute

      logger.info(`Notify launch !`);
      raidCalendarFunctions.raidEventNext()
        .then(response => {
          raidChannel.sendMessage(`@here Le prochain raid prévu est : ${response}`);
        });
    }, 60 * 1000); // Check every minute
  }
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
          .then(response => {
            bot.sendMessage({
              to: channelID,
              message: `@here Un raid est prévu aujourd'hui ${response}`
            });
          });
      break;
      // !raidEventMonth
      case command.raidEventMonth.name:
      case command.raidEventMonth.alias:
        raidCalendarFunctions.raidEventMonth()
          .then(response => {
            bot.sendMessage({
              to: channelID,
              message: response
            });
          });
      break;
    }
  }
});

bot.on('guildMemberAdd', function (member) { 
  // Send a DM with welcome message to new user   
  bot.sendMessage({ 
    to: '' + member.id + '', 
    message: welcome.message
  }); 
});