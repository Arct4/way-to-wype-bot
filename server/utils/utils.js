const _ = require('lodash');

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
  }
}