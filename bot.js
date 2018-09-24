// Packages import
const _ = require('lodash');
const Discord = require('discord.io');
const logger = require('winston');
const fs = require('fs');

// Modules import
const auth = require('./auth.json');
const command = require('./data/common/command.json');
const config = require('./server/config.json');
const botHelper = require('./server/helper/bot-helper');
const utils = require('./server/utils/utils');
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

  botHelper.sendReminderMessage(bot, evt);   
});

bot.on('message', function (user, userID, channelID, message, evt) {
  // Our bot needs to know if it will execute a command
  // It will listen for messages that will start with `!` (default prefix) or a custom prefix set in config.json
  if(_.isEqual(user, bot.username)) return; // Check if the message sender (user) is the bot, if yes, stop treatment.

  let serverId = _.get(evt, 'd.guild_id', 0);
  if(!_.isEqual(serverId, 0)) {
    let configPath = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.configFile;
    if(fs.existsSync(configPath)) {
      let data = require(configPath);
      let prefix = _.get(data, 'prefix.custom', _.get(data, 'prefix.default'));
      if (_.startsWith(message, prefix)) {
        // Check if command is launch on setup channel
        // If no default channel, bot can answer to command on any channel
        // If one default channel set, get this id and compare with channelID params
        if(!_.isEmpty(data.defaultChannel)) {
          if(data.defaultChannel !== channelID) {
            bot.sendMessage({ 
              to: channelID, 
              message: `Les commandes ne peuvent fonctionner que sur le canal <#${data.defaultChannel}>`
            });
            return;
          }
        }
      
        let args = message.substring(_.size(prefix)).split(' ');
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
          // !set-prefix
          case command.setPrefix.name:
            utils.setBotPrefix(args)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: response
                });
              });
            break;
          // !set-default-channel
          case command.setDefaultChannel.name:
          case command.setDefaultChannel.alias:
            utils.setBotDefaultChannel(args)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: response
                });
              });
            break;
          // !raid-status-show
          case command.raidStatusShow.name:
          case command.raidStatusShow.alias:
            raidMembersFunctions.raidStatus('show')
              .then(result => {
                if(!_.isEmpty(result)) {
                  let msg = '';
                  let manyMessages = false;
                  if (result.length >= 1) {
                    manyMessages = true;
                  }
                  for (let index = 0; index < result.length; index++) {
                    if(manyMessages === true && index === 0) {
                      msg = "<@!" + userID + "> " + result[index];
                    } else {
                      msg = result[index];
                    }
                    bot.sendMessage({
                      to: channelID,
                      message: msg
                    });
                  }
                }
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
            raidCalendarFunctions.raidEventNext(serverId)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: `Le prochain évènement à avoir lieu est le suivant : `,
                  embed: response
                });
              });
            break;
          // !raid-event-month
          case command.raidEventMonth.name:
          case command.raidEventMonth.alias:
            raidCalendarFunctions.raidEventMonth(serverId)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: response
                });
              });
            break;
          // !calendar-default-channel
          case command.reminderEventChannel.name:
          case command.reminderEventChannel.alias:
            raidCalendarFunctions.setDefaultChannel(args)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: response
                });
              });
            break;
          case command.calendarGenerateMonthEvents.name:
          case command.calendarGenerateMonthEvents.alias:
            raidCalendarFunctions.generateEvents(args)
              .then(response => {
                bot.sendMessage({
                  to: channelID,
                  message: response
                });
              });
            break;
        }
      }
    }
  }
});

bot.on('guildMemberAdd', function (member) { 
  // Send a DM with welcome message to new user 
  let serverId = _.get(member, 'guild_id', 0);
  if(!_.isEqual(serverId, 0)) {
    botHelper.guildMemberAdd(bot.username, serverId)
      .then(message => {
        if(!_.isEmpty(message)) {
          bot.sendMessage({ 
            to: '' + member.id + '', 
            embed: message
          });
        }
      });
  }
});


bot.on('guildMemberUpdate', function (memberOldRoles, memberNewRoles, user) {
  // Send a DM with doc for new role
  let serverId = _.get(user, 'd.guild_id', 0);
  if(!_.isEqual(serverId, 0)) {
    botHelper.guildMemberUpdate(memberOldRoles, memberNewRoles, bot.username, serverId)
      .then(message => {
        if(!_.isEmpty(message)) {
          bot.sendMessage({ 
            to: '' + _.get(user, 'd.user.id') + '', 
            embed: message
          });
        }
      });
  }
});