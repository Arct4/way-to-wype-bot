const _ = require('lodash');
const logger = require('winston');

const auth = require('../../auth.json');
const config = require('../config.json');
const utils = require('../utils/utils');

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
    this.mythic = [];
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
    this.mythic = data.mythic || [];
  }

  getDataForPlayer(field) {
    return new Promise((resolve, reject) => {
      let apiPath = encodeURI(`https://${this.region}.api.battle.net/wow/character/${this.realm}/${this.name}?fields=${field}&locale=fr_FR&apikey=${auth.wowApiKey}`);
      utils.getDataFromUrl(apiPath)
        .then(result => {
          resolve(result);
        }).catch(error => {
          reject(error);
        });
    });  
  }

  getRaiderIODataForPlayer(field) {
    return new Promise((resolve, reject) => {
      let apiPath = encodeURI(`https://raider.io/api/v1/characters/profile?region=${this.region}&realm=${this.realm}&name=${this.name}&fields=${field}`);      
      utils.getDataFromUrl(apiPath)
        .then(result => {
          resolve(result);
        }).catch(error => {
          reject(error);
        });
    });
  }
}