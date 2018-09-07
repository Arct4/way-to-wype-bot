const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');

const config = require('../config.json');

module.exports = {
  getRaidChannel: function (channels) {
    if(!_.isEmpty(config.defaultNotifyChannel)) {
      return _.find(channels, function(channel) {
        return channel.name === config.defaultNotifyChannel;
      });
    } else {
      return '';
    }
  },

  setBotPrefix: function (arg) {
    return new Promise((resolve, reject) => {
      if(!_.isEmpty(arg)) {
        _.set(config, 'prefix.custom', arg[0]);

        fs.writeFileSync('./server/utils/config.json', JSON.stringify(config, null, 2), function (err) {
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
  }
}