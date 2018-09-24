
const _ = require('lodash');
const fs = require('fs');
const logger = require('winston');

const config = require('../config.json');
const utils = require('../utils/utils');

const raidCalendarFunctions = require('../raid/raid-calendar');

// Const for interval message
const START_DATE = '2018-09-06'; // Date used as the starting point for multi-hour intervals, must be YYYY-MM-DD format
const START_HOUR = 9; // Hour of the day when the timer begins (0 is 12am, 23 is 11pm), used with START_DATE and INTERVAL_HOURS param
const INTERVAL_HOURS = 24; // Trigger at an interval of every X hours
const TARGET_MINUTE = 0; // Minute of the hour when the chest will refresh, 30 means 1:30, 2:30, etc.
const OFFSET = 0; // Notification will warn that the target is X minutes away
// Don't change any code below
const NOTIFY_MINUTE = (TARGET_MINUTE < OFFSET ? 60 : 0) + TARGET_MINUTE - OFFSET;
const START_TIME = new Date(new Date(START_DATE).getTime() + new Date().getTimezoneOffset() * 60000 + START_HOUR * 3600000).getTime();

module.exports = {
  sendReminderMessage: function (bot, evt) {
    logger.info('sendReminderMessage launch');
    // Set interval to send a reminder message for raid
    _.forEach(_.get(evt, 'd.guilds'), function (guild) {
      let configPath = config.dataFolder + config.configFolder + '/' + _.get(guild, 'id') + '/' + config.configFile;
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
                  logger.info('raidCalendarFunctions.nextDateEvent() : ' + response);
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
  },

  // Generate message to welcome a new discord member  
  // @param {string} botUsername Bot name added to embedMessage
  // @param {string} serverId Server id to get the correct configuration
  // @returns {object} embedMessage send by the bot to the new member
  guildMemberAdd: function (botUsername, serverId) {
    return new Promise((resolve, reject) => {
      let embedMessage = {};
      let fullPath = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.welcomeFile;
      if(fs.existsSync(fullPath)) {
        let welcomeData = JSON.parse(fs.readFileSync(fullPath));

        embedMessage = {
          color: 0x93c502,
          author: {
            name: botUsername,
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
            text: _.get(welcomeData, 'embed.footer.text', '') + botUsername
          }
        };

        resolve(embedMessage);
      } else {
        reject(embedMessage);
      }
    });
  },

  // Generate and send a DM to describe new roles for the user
  // @param {array} memberOldRoles List of all roles define for the updated user, before discord role update
  // @param {array} memberNewRoles List of all roles define for the updated user, after discord role update
  // @param {string} botUsername Bot name added to embedMessage
  // @param {string} serverId Server id to get the correct configuration
  // @returns {object} embedMessage send by the bot to the updated member
  guildMemberUpdate: function (memberOldRoles, memberNewRoles, botUsername, serverId) {
    return new Promise((resolve, reject) => {
      let embedMessage = {};
      let fullPath = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.rolesFile;
      if(fs.existsSync(fullPath)) {      
        let newRoles = _.get(memberNewRoles, 'roles');
        let oldRoles = _.get(memberOldRoles, 'roles');
  
        // Don't send message if the role is deleted for the user
        if(_.size(newRoles) < _.size(oldRoles)) reject(embedMessage);
  
        let newRole = _.difference(_.union(oldRoles, newRoles), _.intersection(oldRoles, newRoles));
        if (!_.isEmpty(newRole)) {
          let rolesData = JSON.parse(fs.readFileSync(fullPath));
  
          // Generate the message to send to the user
          let roleData = _.find(rolesData, function(role) {
            return role.id === newRole[0];
          });
  
          if(!_.isEmpty(roleData)) {
            // Send DM message
            embedMessage = {
              color: 0x93c502,
              author: {
                name: botUsername,
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
                text: _.get(roleData, 'embed.footer.text', '') + botUsername
              }
            };

            resolve(embedMessage);
          } else {
            reject(embedMessage);
          }
        } else {
          reject(embedMessage);
        }
      } else {
        reject(embedMessage);
      }
    });
  }
}