const _ = require('lodash');
const logger = require('winston');
const https = require('https');

const auth = require('../../auth.json');
const config = require('../config.json');

// Configure logger settings
logger.level = config.loggerLevel;

module.exports = class Player {
  constructor(value) {
    this.name = _.upperFirst(value);
    this.realm = config.defaultRealm;
    this.region = config.defaultRegion;
    this.class = '';
    this.role = '';
    this.ilvl = 0;
    this.ilvlEquipped = 0;
    this.enchant = {};
    this.enchant.weapon = 'Non';
    this.enchant.ring1 = 'Non';
    this.enchant.ring2 = 'Non';
    this.lastUpdate = 0;
  }

  set setProperties(data) {
    this.name = data.name;
    this.realm = data.realm;
    this.region = data.region;
    this.class = data.class || '';
    this.role = data.role || '';
    this.ilvl = data.ilvl || 0;
    this.ilvlEquipped = data.ilvlEquipped || 0;
    this.enchant = data.enchant || {};
    this.enchant.weapon = _.get(data, 'enchant.weapon') || 'Non';
    this.enchant.ring1 = _.get(data, 'enchant.ring1') || 'Non';
    this.enchant.ring2 = _.get(data, 'enchant.ring2') || 'Non';
    this.lastUpdate = data.lastUpdate || 0;
  }

  getDataForPlayer(field) {
    return new Promise((resolve, reject) => {
      let apiPath = encodeURI(`https://${this.region}.api.battle.net/wow/character/${this.realm}/${this.name}?fields=${field}&locale=fr_FR&apikey=${auth.wowApiKey}`);
      https.get(apiPath, (res) => {
        var { statusCode } = res;
        var contentType = res.headers['content-type'];
        let rawData = '';
        let error;
  
        if (statusCode !== 200) {
          error = new Error('Request Failed.\n' + `Status Code: ${statusCode} for path ${apiPath}`);
        } else if (!/^application\/json/.test(contentType)) {
          error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
        }
  
        if (error) {
          logger.error(error.message);
          // consume response data to free up memory
          res.resume();
        }
  
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          rawData += chunk;
        });
  
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            reject(e.message);
          }
        });
      }).on('error', (e) => {
        reject(`Got error: ${e.message}`);
      });
    });  
  }
}