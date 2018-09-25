const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');
const moment = require('moment');

const config = require('../config.json');
const commonFiles = require('../common/asyncFiles');
const Player = require('../common/player');
const enumClass = require('../../data/common/class.json');

// Configure logger settings
logger.level = config.loggerLevel;

const STRING_SEPARATOR = '|';
const STRING_MAX_LENGTH = 106;
const STRING_MYTHIC_MAX_LENGTH = 79;
const TEXT_MESSAGE_LIMIT = 2000;
const listDungeons = ['AD', 'UNDR', 'ML', 'TD', 'FH', 'KR', 'TOS', 'SOTS', 'WM', 'SIEGE'];

module.exports = {
  // use to answer to !raid-status command
  raidStatus: function (serverId, action, bot, channelID) {
    return new Promise((resolve, reject) => {
      switch(action) {
        // !raid-status-show command
        case "show":
          showRoster(serverId)
            .then(result => {
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        break;
        // !raid-status-update command
        case "update":
          checkArmoryForRoster(serverId, bot, channelID)
            .then(result => {
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        break;
        // !raid-mythic-show command
        case "show-mythic":
          showMythic(serverId)
            .then(result => {
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        break;
        // !raid-mythic-update command
        case "update-mythic":
          checkRaiderIoForRoster(serverId, bot, channelID)
            .then(result => {
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        break;
      }
    });
  },
  // use to answer to !raid-member command
  raidMembers: function (serverId, action, args) {
    let msg = '';
    switch(action) {
      // !raid-member-add command
      case "add":
        msg = addPlayersToRoster(serverId, args);        
      break;
      // !raid-member-remove command
      case "remove":
        msg = removePlayersFromRoster(serverId, args);      
      break;      
      case "set-role": // !raid-member-set-role command
      case "set-class": // !raid-member-set-class command
      case "set-realm": // !raid-member-set-realm command
        msg = setPropertyForPlayer(serverId, args, action);
      break;
    }

    return msg;
  },
  // use to update one player each time
  raidMembersUpdate: function (serverId, args) {
    return new Promise((resolve, reject) => {
      updatePlayer(serverId, args)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

//#region raidStatus functions
// Get all data from json files and give a preformatted text
let showRoster = function (serverId) {
  return new Promise((resolve, reject) => {
    let sizeOfMessage = 0;
    let tabMessages = [];
    let message = '';
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/';

    let header = '```css\n' 
      + STRING_SEPARATOR + _.pad('', STRING_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n'  
      + STRING_SEPARATOR + ' ' + _.pad('Personnage', 16) 
      + STRING_SEPARATOR + ' ' + _.pad('Classe', 10) 
      + STRING_SEPARATOR + ' ' + _.pad('Role', 8) 
      + STRING_SEPARATOR + _.pad('Ilvl', 6)
      + STRING_SEPARATOR + _.pad('IlvlE', 8)
      + STRING_SEPARATOR + _.pad('HoA', 6)
      + STRING_SEPARATOR + _.pad('Arme', 6) 
      + STRING_SEPARATOR + _.pad('Anneau 1', 8) 
      + STRING_SEPARATOR + _.pad('Anneau 2', 8)
      + STRING_SEPARATOR + _.pad('Mise à jour', 18)
      + STRING_SEPARATOR + '\n' 
      + STRING_SEPARATOR + _.pad('', STRING_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n';
    let content = '';
    let footer = STRING_SEPARATOR + _.pad('', STRING_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n```';

    // Get first size of text
    sizeOfMessage = (_.size(header) + _.size(content) + _.size(footer));
    commonFiles.readdirAsync(path)
      .then(results => {
        if(!_.isEmpty(results)) {
          let players = [];
          for (let index = 0; index < results.length; index++) {
            players.push(commonFiles.readFileAsync(path + results[index]));
          }
         
          Promise.all(players)
            .then(playersList => {
              if(!_.isEmpty(playersList)) {
                playersList = _.orderBy(playersList, ['role', 'ilvlEquipped', 'class'], ['desc', 'desc', 'asc']);

                _.forEach(playersList, function (player) {
                  let lastUpdate = moment(_.get(player, 'lastUpdate', '')).format('DD-MM-YYYY HH:mm').toString();

                  message = STRING_SEPARATOR + ' ' + _.padEnd(_.get(player, 'name', ''), 16) 
                    + STRING_SEPARATOR + ' ' + _.padEnd(_.get(player, 'class', ''), 10) 
                    + STRING_SEPARATOR + ' ' + _.padEnd(_.get(player, 'role', ''), 8) 
                    + STRING_SEPARATOR + _.pad(_.get(player, 'ilvl', ''), 6) 
                    + STRING_SEPARATOR + _.pad(_.get(player, 'ilvlEquipped', ''), 8)
                    + STRING_SEPARATOR + _.pad(calculateNeckLevel(_.get(player, 'neck', '')), 6)
                    + STRING_SEPARATOR + _.pad(_.get(player, 'enchant.weapon', ''), 6) 
                    + STRING_SEPARATOR + _.pad(_.get(player, 'enchant.ring1', ''), 8) 
                    + STRING_SEPARATOR + _.pad(_.get(player, 'enchant.ring2', ''), 8) 
                    + STRING_SEPARATOR + _.pad(lastUpdate, 18)
                    + STRING_SEPARATOR + '\n';

                  if((_.size(message) + sizeOfMessage) <= TEXT_MESSAGE_LIMIT) {                    
                    content += message;
                  } else {
                    tabMessages.push(header + content + footer);                    
                    content = message;
                  }

                  // Update size of message
                  sizeOfMessage = _.size(header) + _.size(content) + _.size(footer);
                });

                if(_.isEmpty(tabMessages) ||
                    !_.isEmpty(content)) {
                  // Full message is shorter than TEXT_MESSAGE_LIMIT, must add content after loop treatment
                  tabMessages.push(header + content + footer);
                }
              }

              resolve(tabMessages);
            })
            .catch(error => {
              reject(error);
            });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

// Get all data from Blizzard Armory for player's file
let checkArmoryForRoster = function (serverId, bot, channelID) {
  return new Promise((resolve, reject) => {
    let response = {};
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/';
    
    if(!_.isEmpty(path)) {
      fs.readdir(path, function (err, files) {
        if (err) throw err;

        bot.sendMessage({
          to: channelID,
          message: 'Update du roster en cours'
        }, function(err, res) {
          if(err) throw err;
          
          _.set(response, 'channelId', channelID);
          _.set(response, 'messageId', res.id);
          _.set(response, 'message', 'La mise à jour du roster a été effectuée. Utilisez la commande `raid-status-show` ou `rss` pour le voir.');

          files.forEach(function (file) {          
            let fullPath = path + file;
            let rawdata = fs.readFileSync(fullPath);
  
            let player = new Player();          
            player.setProperties = JSON.parse(rawdata);

            // Update message to give some information to bot's user
            bot.editMessage({
              channelID: channelID,
              messageID: res.id,
              message: `Mise à jour du joueur '${_.get(player, 'name')}' en cours.`
            });

            // Update items datas
            player.getDataForPlayer('items,talents')
            .then(response => {
              setPropertyForPlayerFromArmory(fullPath, player, response);
              resolve(`Le joueur ${player.name} a été mis à jour.`);              
            })
            .catch(error => {
              reject(error);
            });
          });
  
          resolve(response);
        });
      });
    }
  });
}
//#endregion

//#region raidMembers functions
// Add players to the guild roster
let addPlayersToRoster = function (serverId, playersName) {
  let msg = '';
  let addedPlayers = '';
  let existedPlayers = '';
  _.forEach(playersName, function(value) {
    // if player name has name-realm, split in to 2 strings
    let name = value.split('-')[0];
    let realm = value.split('-')[1];

    // if player name already in file, don't add to the file
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/' + _.lowerCase(name) + '.json';
    if(!fs.existsSync(path)) {
      // create json object for new player            
      let playerData = new Player(name);
      playerData.realm = !_.isEmpty(realm) ? realm : config.defaultRealm;

      // create json file for new player
      fs.writeFileSync(path, JSON.stringify(playerData, null, 2), function (err) {
        if (err) {
          logger.error(err);
          throw err;
        }
      });

      addedPlayers = addedPlayers + value + ' ';
    } else {
      // nothing to do
      existedPlayers = existedPlayers + value + ' ';
    }
  });

  if(addedPlayers.length != 0) {        
    msg = 'Players ' + addedPlayers + 'are added to Way to Wype roster.';
  }

  if(existedPlayers.length != 0) {
    if(msg.length != 0) {
      msg = msg + '\n';
    }
    msg = msg + 'Players ' + existedPlayers + 'are already in Way to Wype roster.';
  }

  return msg;
}

// Remove players from the guild roster
let removePlayersFromRoster = function (serverId, playersName) {
  let msg = '';
  let removedPlayers = '';
  let notExistPlayers = '';

  _.forEach(playersName, function(value) {
    // if player file exist, we can delete it
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/' + _.lowerCase(value) + '.json';
    if(fs.existsSync(path)) {
      // delete json file
      fs.unlinkSync(path, function (err) {
        if (err) {
          logger.error(err);
          throw err;
        }
      });

      removedPlayers = removedPlayers + value + ' ';
    } else {
      // nothing to do
      notExistPlayers = notExistPlayers + value + ' ';
    }
  });

  if(removedPlayers.length != 0) {        
    msg = 'Players ' + removedPlayers + 'are removed from Way to Wype roster.';
  }

  if(notExistPlayers.length != 0) {
    if(msg.length != 0) {
      msg = msg + '\n';
    }
    msg = msg + 'Players ' + notExistPlayers + 'are not known in Way to Wype roster.';
  }

  return msg;
}

// Use to update a specific player (command !raid-member-update)
let updatePlayer = function (serverId, playerName) {
  return new Promise((resolve, reject) => {
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/' + _.lowerCase(playerName) + '.json';
    if(fs.existsSync(path)) {
      let rawdata = fs.readFileSync(path);

      let player = new Player();          
      player.setProperties = JSON.parse(rawdata);

      // Update items datas
      player.getDataForPlayer('items,talents')
        .then(response => {
          setPropertyForPlayerFromArmory(path, player, response);
          resolve(`Le joueur ${player.name} a été mis à jour.`); 
        })
        .catch(error => {
          reject(error);
        });
    } else resolve(`Joueur ${player.name} introuvable`);
  });
}

// Set a role, class or realm to roster's member
// First arg : role or class or realm
// Another args : list of players to update
let setPropertyForPlayer = function (serverId, args, action) {
  let msg = '';
  let updatedPlayers = '';
  let notExistPlayers = '';

  let property = _.lowerCase(args[0]);
  let playersName = args.splice(1);

  _.forEach(playersName, function(value) {
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/' + _.lowerCase(value) + '.json';
    if(fs.existsSync(path)) {
      let rawdata = fs.readFileSync(path);
      let player = JSON.parse(rawdata);

      switch (action) {
        case "set-role":
          if (property !== 'tank' && property !== 'heal' && property !== 'dps') {
            msg = 'Unknown role, please set \'Tank\', \'Heal\' or \'Dps\'';
          } else {
            player.role = _.upperFirst(property);          
          }
        break;
        case "set-class":
          player.class = _.upperFirst(property);
        break;
        case "set-realm":
          player.realm = _.upperFirst(property);
        break;
      }
      
      // update json file for player
      fs.writeFileSync(path, JSON.stringify(player, null, 2), function (err) {
        if (err) {
          logger.error(err);
          throw err;
        }
      });

      updatedPlayers = updatedPlayers + value + ' ';
    } else {
      // nothing to do
      notExistPlayers = notExistPlayers + value + ' ';
    }
  });

  if(updatedPlayers.length != 0) {        
    msg = 'Players ' + updatedPlayers + 'are updated.';
  }

  if(notExistPlayers.length != 0) {
    if(msg.length != 0) {
      msg = msg + '\n';
    }
    msg = msg + 'Players ' + notExistPlayers + 'are not known in Way to Wype roster.';
  }

  return msg;
}

let setPropertyForPlayerFromArmory = function (path, player, data) {
  let lastArmoryUpdate = _.get(data, 'lastModified');
  let lastFileUpdate = _.get(player, 'lastUpdate', new Date().getTime());

  if(lastFileUpdate <= lastArmoryUpdate) {
    player.ilvl = _.get(data, 'items.averageItemLevel', 0);
    player.ilvlEquipped = _.get(data, 'items.averageItemLevelEquipped', 0);

    if(_.get(data, 'items.mainHand.appearance.enchantDisplayInfoId')) _.set(player, 'enchant.weapon', 'Oui');
    else _.set(player, 'enchant.weapon', 'Non');
    if(_.get(data, 'items.finger1.appearance.enchantDisplayInfoId')) _.set(player, 'enchant.ring1', 'Oui');
    else _.set(player, 'enchant.ring1', 'Non');
    if(_.get(data, 'items.finger2.appearance.enchantDisplayInfoId')) _.set(player, 'enchant.ring2', 'Oui');
    else _.set(player, 'enchant.ring2', 'Non');

    // Find class
    let classPlayer = _.find(enumClass.classes, function(idClass) {
      return _.get(data, 'class') === idClass.id;
    })
    if(_.get(classPlayer, 'name')) _.set(player, 'class', _.get(classPlayer, 'name'));

    // Find active spec
    let activeSpec = _.find(data.talents, function(spec) {
      return _.get(spec, 'selected', false) === true;
    })
    if(_.get(activeSpec, 'spec.role')) _.set(player, 'role', _.upperFirst(_.toLower(_.get(activeSpec, 'spec.role'))));

    // Find HoA level
    if(_.get(data, 'items.neck.azeriteItem')) {
      _.set(player, 'neck.level', _.get(data, 'items.neck.azeriteItem.azeriteLevel'));
      _.set(player, 'neck.experience', _.get(data, 'items.neck.azeriteItem.azeriteExperience'));
      _.set(player, 'neck.nextLevel', _.get(data, 'items.neck.azeriteItem.azeriteExperienceRemaining'));
    }

    player.lastUpdate = lastArmoryUpdate;
    
    // update json file for player
    fs.writeFileSync(path, JSON.stringify(player, null, 2), function (err) {
      if (err) {
        logger.error(err);
        throw err;
      }
    });
  }
}

let calculateNeckLevel = function (playerNeck) {
  let level = _.get(playerNeck, 'level', 0);
  let exp = _.get(playerNeck, 'experience', 0);
  let needed = _.get(playerNeck, 'nextLevel', 0);

  if(needed !== 0 && exp !== 0) {
    return (level + (exp / needed)).toFixed(1);
  } else return 0;
}
//#endregion

//#region RaiderIO functions
let checkRaiderIoForRoster = function (serverId, bot, channelID) {
  return new Promise((resolve, reject) => {
    let response = {};
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/';
    
    if(!_.isEmpty(path)) {
      fs.readdir(path, function (err, files) {
        if (err) throw err;

        bot.sendMessage({
          to: channelID,
          message: 'Update des scores Mythic+ du roster en cours'
        }, function(err, res) {
          if(err) throw err;
          
          _.set(response, 'channelId', channelID);
          _.set(response, 'messageId', res.id);
          _.set(response, 'message', 'La mise à jour du roster a été effectuée. Utilisez la commande `raid-mythic-show` ou `ios` pour le voir.');

          files.forEach(function (file) {          
            let fullPath = path + file;
            let rawdata = fs.readFileSync(fullPath);
  
            let player = new Player();          
            player.setProperties = JSON.parse(rawdata);

            // Update message to give some information to bot's user
            bot.editMessage({
              channelID: channelID,
              messageID: res.id,
              message: `Mise à jour du joueur '${_.get(player, 'name')}' en cours.`
            });

            // Update items datas
            player.getRaiderIODataForPlayer('mythic_plus_best_runs:all')
              .then(response => {
                setPropertyForPlayerFromRaiderIo(fullPath, player, response);
                resolve(`Le joueur ${player.name} a été mis à jour.`);              
              })
              .catch(error => {
                reject(error);
              });
          });
  
          resolve(response);
        });
      });
    }
  });
}

let setPropertyForPlayerFromRaiderIo = function (path, player, data) {
  let dungeonsData = _.get(data, 'mythic_plus_best_runs');
  if (!_.isEmpty(dungeonsData)) {
    let dungeonArray = [];
    _.forEach(dungeonsData, function (dungeon) {
      let dungeonObject = {};
      _.set(dungeonObject, 'dungeon', _.get(dungeon, 'dungeon', ''));
      _.set(dungeonObject, 'short_name', _.get(dungeon, 'short_name', ''));
      _.set(dungeonObject, 'mythic_level', _.get(dungeon, 'mythic_level', 0));
      _.set(dungeonObject, 'num_keystone_upgrades', _.get(dungeon, 'num_keystone_upgrades', 0));

      dungeonArray.push(dungeonObject);
    });

    if (!_.isEmpty(dungeonArray)) {
      _.set(player, 'mythic', dungeonArray);

      // update json file for player
      fs.writeFileSync(path, JSON.stringify(player, null, 2), function (err) {
        if (err) {
          logger.error(err);
          throw err;
        }
      });
    }
  }
}

let showMythic = function (serverId) {
  return new Promise((resolve, reject) => {
    let sizeOfMessage = 0;
    let tabMessages = [];
    let message = '';
    let path = config.dataFolder + config.rosterFolder + '/' + serverId + '/';
    
    let header = '```css\n' 
      + STRING_SEPARATOR + _.pad('', STRING_MYTHIC_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n'  
      + STRING_SEPARATOR + ' ' + _.pad('Personnage', 16) 
      + STRING_SEPARATOR + _.pad('AD', 5) 
      + STRING_SEPARATOR + _.pad('UNDR', 5) 
      + STRING_SEPARATOR + _.pad('ML', 5)
      + STRING_SEPARATOR + _.pad('TD', 5)
      + STRING_SEPARATOR + _.pad('FH', 5)
      + STRING_SEPARATOR + _.pad('KR', 5) 
      + STRING_SEPARATOR + _.pad('TOS', 5) 
      + STRING_SEPARATOR + _.pad('SOTS', 5)
      + STRING_SEPARATOR + _.pad('WM', 5)
      + STRING_SEPARATOR + _.pad('SIEGE', 7)
      + STRING_SEPARATOR + '\n' 
      + STRING_SEPARATOR + _.pad('', STRING_MYTHIC_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n';
    let content = '';
    let footer = STRING_SEPARATOR + _.pad('', STRING_MYTHIC_MAX_LENGTH, '-') + STRING_SEPARATOR + '\n```';

    // Get first size of text
    sizeOfMessage = (_.size(header) + _.size(content) + _.size(footer));
    commonFiles.readdirAsync(path)
      .then(results => {
        if(!_.isEmpty(results)) {
          let players = [];
          for (let index = 0; index < results.length; index++) {
            players.push(commonFiles.readFileAsync(path + results[index]));
          }
         
          Promise.all(players)
            .then(playersList => {
              if(!_.isEmpty(playersList)) {
                playersList = _.orderBy(playersList, ['name'], ['asc']);

                _.forEach(playersList, function (player) {
                  let mythicData = _.get(player, 'mythic');
                  if(!_.isEmpty(mythicData)) {
                    message = STRING_SEPARATOR + ' ' + _.padEnd(_.get(player, 'name', ''), 16) 
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 0), 5) 
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 1), 5) 
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 2), 5)
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 3), 5)
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 4), 5)
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 5), 5) 
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 6), 5) 
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 7), 5)
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 8), 5)
                      + STRING_SEPARATOR + _.pad(getLevelForDungeon(mythicData, 9), 7)
                      + STRING_SEPARATOR + '\n';

                    if((_.size(message) + sizeOfMessage) <= TEXT_MESSAGE_LIMIT) {                    
                      content += message;
                    } else {
                      tabMessages.push(header + content + footer);                    
                      content = message;
                    }

                    // Update size of message
                    sizeOfMessage = _.size(header) + _.size(content) + _.size(footer);
                  }
                });

                if(_.isEmpty(tabMessages) ||
                    !_.isEmpty(content)) {
                  // Full message is shorter than TEXT_MESSAGE_LIMIT, must add content after loop treatment
                  tabMessages.push(header + content + footer);
                }
              }

              resolve(tabMessages);
          })
          .catch(error => {
            reject(error);
          });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

let getLevelForDungeon = function (mythicData, index) {  
  let result = '0';
  let dungeon = _.find(mythicData, function (dungeon) {
    return listDungeons[index] === dungeon.short_name;
  });

  if(!_.isEmpty(dungeon)) {
    result = _.padEnd(_.get(dungeon, 'mythic_level', 0), _.get(dungeon, 'num_keystone_upgrades',0), '*');
  }

  return result;
}
//#endregion