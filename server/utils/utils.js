const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');

const config = require('../config.json');

module.exports = {
  getAnswerChannel: function (channels) {
    if(!_.isEmpty(config.defaultChannel)) {
      return _.find(channels, function(channel) {
        return channel.id === config.defaultChannel;
      });
    } else {
      return '';
    }
  },

  getRaidChannel: function (channels) {
    if(!_.isEmpty(config.defaultNotifyChannel)) {
      return _.find(channels, function(channel) {
        return channel.id === config.defaultNotifyChannel;
      });
    } else {
      return '';
    }
  },

  setBotPrefix: function (arg) {
    return new Promise((resolve, reject) => {
      if(!_.isEmpty(arg)) {
        _.set(config, 'prefix.custom', arg[0]);

        fs.writeFileSync('./server/config.json', JSON.stringify(config, null, 2), function (err) {
          if (err) {
            logger.error(err);
            reject(err);
          }
        });

        resolve('Préfixe customisé défini à : `' + arg[0] + '`');
      } else {
        reject('Impossible de définir le préfixe customisé.');
      }
    });
  },

  setBotDefaultChannel: function (arg) {
    return new Promise((resolve, reject) => {
      if(!_.isEmpty(arg)) {
        let idChannel = arg[0].substr(2, _.size(arg[0]) - 3);
        _.set(config, 'defaultChannel', idChannel);

        fs.writeFileSync('./server/config.json', JSON.stringify(config, null, 2), function (err) {
          if (err) {
            logger.error(err);
            reject(err);
          }
        });

        resolve('Canal par défaut défini à : <#' + idChannel + '>');
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