// Packages import
const _ = require('lodash');
const Discord = require('discord.io');
const logger = require('winston');
const fs = require('fs');

// Modules import
const auth = require('./auth.json');
const command = require('./data/common/command.json');
const config = require('./server/config.json');
const utils = require('./server/utils/utils');
const raidMembersFunctions = require('./server/raid/raid-member');
const raidCalendarFunctions = require('./server/raid/raid-calendar');

// Const for interval message
const START_DATE = '2018-09-06'; // Date used as the starting point for multi-hour intervals, must be YYYY-MM-DD format
const START_HOUR = 9; // Hour of the day when the timer begins (0 is 12am, 23 is 11pm), used with START_DATE and INTERVAL_HOURS param
const INTERVAL_HOURS = 24; // Trigger at an interval of every X hours
const TARGET_MINUTE = 0; // Minute of the hour when the chest will refresh, 30 means 1:30, 2:30, etc.
const OFFSET = 0; // Notification will warn that the target is X minutes away
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
  _.forEach(evt.d.guilds, function (guild) {
    let configPath = config.dataFolder + config.configFolder + '/' + guild.id + '/' + config.configFile;
    if(fs.existsSync(configPath)) {
      let data = JSON.parse(fs.readFileSync(configPath));
      let raidChannel = utils.getRaidChannel(data, bot.channels);
      if (!_.isEmpty(raidChannel)) {
        setInterval(function() {
          var d = new Date();
          if(Math.floor((d.getTime() - START_TIME) / 3600000) % INTERVAL_HOURS > 0) return; // Return if hour is not the correct interval
          if(d.getMinutes() !== NOTIFY_MINUTE) return; // Return if current minute is not the notify minute
    
          raidCalendarFunctions.nextDateEvent(guild.id)
            .then(response => {
              logger.info('get raidCalendarFunctions.nextDateEvent()');
              if(!_.isEmpty(response)) {
                logger.info('radCalenderFunctions.nextDateEvent() : ' + response);
                bot.sendMessage({
                  to: raidChannel.id,
                  message: `Un évènement est prévu aujourd'hui`,
                  embed: response
                })
              }
            });
        }, 60 * 1000); // Check every minute
      }
    }
  });  
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
              message: `Les commandes ne peuvent fonctionner que sur le canal <#${config.defaultChannel}>`
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
    let fullPath = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.welcomeFile;
    if(fs.existsSync(fullPath)) {
      let welcomeData = JSON.parse(fs.readFileSync(fullPath));

      bot.sendMessage({ 
        to: '' + member.id + '', 
        embed: {
          color: 0x93c502,
          author: {
            name: bot.username,
            icon_url: _.get(welcomeData, 'embed.author.icon_url', '')
          },
          title: _.get(welcomeData, 'embed.title', ''),
          description: _.get(welcomeData, 'embed.description', ''),
          fields: [{
            name: _.get(welcomeData, 'embed.fields.0.name', ''),
            value: _.get(welcomeData, 'embed.fields.0.value', '')
          },
          {
            name: _.get(welcomeData, 'embed.fields.1.name', ''),
            value: _.get(welcomeData, 'embed.fields.1.value', '')
          }],
          timestamp: new Date(),
          footer: {
            icon_url: _.get(welcomeData, 'embed.footer.icon_url', ''),
            text: _.get(welcomeData, 'embed.footer.text', '') + bot.username
          }
        }
      });
    }
  }
});

// Generate and send a DM to describe new roles for the user
// @param {array} memberOldRoles List of all roles define for the updated user, before discord role update
// @param {array} memberNewRoles List of all roles define for the updated user, after discord role update
// @param {object} user User updated
bot.on('guildMemberUpdate', function (memberOldRoles, memberNewRoles, user) {
  // Get the serverId from user
  let serverId = _.get(user, 'd.guild_id', 0);
  if(!_.isEqual(serverId, 0)) {
  console.log(evt);
  let fullPath = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.rolesFile;
    if(fs.existsSync(fullPath)) {      
      let newRoles = _.get(memberNewRoles, 'roles');
      let oldRoles = _.get(memberOldRoles, 'roles');

      // Don't send message if the role is deleted for the user
      if(_.size(newRoles) < _.size(oldRoles)) return;

      let newRole = _.difference(_.union(oldRoles, newRoles), _.intersection(oldRoles, newRoles));
      if (!_.isEmpty(newRole)) {
        let rolesData = JSON.parse(fs.readFileSync(fullPath));

        // Generate the message to send to the user
        let roleData = _.find(rolesData, function(role) {
          return role.id === newRole[0];
        });

        if(!_.isEmpty(roleData)) {
          // Send DM message
          bot.sendMessage({
            to: '' + _.get(user, 'd.user.id') + '', 
            embed: {
              color: 0x93c502,
              author: {
                name: bot.username,
                icon_url: _.get(roleData, 'embed.author.icon_url', '')
              },
              title: _.get(roleData, 'embed.title', ''),
              description: _.get(roleData, 'embed.description', ''),
              fields: [{
                name: _.get(roleData, 'embed.fields.0.name', ''),
                value: _.get(roleData, 'embed.fields.0.value', '')
              }],
              timestamp: new Date(),
              footer: {
                icon_url: _.get(roleData, 'embed.footer.icon_url', ''),
                text: _.get(roleData, 'embed.footer.text', '') + bot.username
              }
            }
          });
        }
      }
    }
  }
});