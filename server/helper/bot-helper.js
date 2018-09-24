
const _ = require('lodash');
const fs = require('fs');

const config = require('../config.json');

module.exports = {
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