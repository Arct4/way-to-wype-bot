const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');

const config = require('../config.json');

module.exports = {
  getRaidChannel: function (data, channels) {
    if(!_.isEmpty(data.defaultNotifyChannel)) {
      return _.find(channels, function(channel) {
        return channel.id === data.defaultNotifyChannel;
      });
    } else {
      return '';
    }
  },

  setBotPrefix: function (serverId, arg) {
    return new Promise((resolve, reject) => {
      if(!_.isEmpty(arg)) {
        let path = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.configFile;
        if(fs.existsSync(path)) {
          let configData = JSON.parse(fs.readSync(path));
          
          _.set(configData, 'prefix.custom', arg[0]);
          
          fs.writeFileSync(path, JSON.stringify(configData, null, 2), function (err) {
            if (err) {
              logger.error(err);
              reject(err);
            }
          });

          resolve('Préfixe customisé défini à : `' + arg[0] + '`');
        } else {
          reject('Impossible de trouver le fichier de configuration du serveur.');
        }
      } else {
        reject('Impossible de définir le préfixe customisé.');
      }
    });
  },

  setBotDefaultChannel: function (serverId, arg) {
    return new Promise((resolve, reject) => {
      if(!_.isEmpty(arg)) {
        let path = config.dataFolder + config.configFolder + '/' + serverId + '/' + config.configFile;
        if(fs.existsSync(path)) {
          let configData = JSON.parse(fs.readSync(path));

          let idChannel = arg[0].substr(2, _.size(arg[0]) - 3);
          _.set(configData, 'defaultChannel', idChannel);

          fs.writeFileSync(path, JSON.stringify(configData, null, 2), function (err) {
            if (err) {
              logger.error(err);
              reject(err);
            }
          });

          resolve('Canal par défaut défini à : <#' + idChannel + '>');
        } else {
          reject('Impossible de trouver le fichier de configuration du serveur.');
        }
      } else {
        reject('Impossible de définir le canal par défaut.');
      }
    });
  },

  getDaysForMonth: function (date) {
    let d = date || new Date();
    let month = d.getMonth();
    let day = d.getDay();
    let days = [];

    d.setDate(1);

    // Get the first Monday in the month
    while (d.getDay() !== day) {
      d.setDate(d.getDate() + 1);
    }

    // Get all the other Mondays in the month
    while (d.getMonth() === month) {
      days.push(new Date(d.getTime()));
      d.setDate(d.getDate() + 7);
    }

    return days;
  }
}