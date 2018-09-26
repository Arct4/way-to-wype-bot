const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');
const moment = require('moment');

const config = require('../config.json');
const utils = require('../utils/utils');

const Event = require('../common/eventCalendar');
const enumEventType = require('../../data/common/event/eventType.json');
const enumEventDifficulty = require('../../data/common/event/eventDifficulty.json');

// Configure logger settings
logger.level = config.loggerLevel;
moment.locale('fr');

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const periods = { day: 'day', month: 'month', next: 'next' };

module.exports = {
  // Get Next event
  raidEventNext: function(serverId) {
    return new Promise((resolve, reject) => {
      getEvents(serverId, periods.day)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  // Get all events for current month
  raidEventMonth: function(serverId) {
    return new Promise((resolve, reject) => {
      getEvents(serverId, periods.month)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  // Get next Event 
  nextDateEvent: function(serverId) {
    return new Promise((resolve, reject) => {
      getEvents(serverId, periods.next)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  setDefaultChannel: function(args) {
    return new Promise((resolve, reject) => {
      let path = './server/config.json';
      if(fs.existsSync(path)) {
        let rawdata = fs.readFileSync(path);
        let config = JSON.parse(rawdata);
        
        if(!_.isEmpty(config)) {
          let idChannel = args[0].substr(2, _.size(args[0]) - 3);
          _.set(config, 'defaultNotifyChannel', idChannel);

          // update json file for player
          fs.writeFileSync(path, JSON.stringify(config, null, 2), function (err) {
            if (err) {
              logger.error(err);
              reject(err);
            }
          });

          resolve('Default channel set to <#' + idChannel + '>');
        }
      }
    });
  },

  generateEvents: function (args) {
    return new Promise((resolve, reject) => {
      let type = _.toLower(args[0]);
      let month = args[1];

      if(!_.isEmpty(type)) {
        // Find type id in enum with given arg
        let enumType = _.find(enumEventType.eventType, function (et) {
          return (_.isEqual(_.toLower(et.name), type) || _.includes(_.toLower(et.alias), type));
        });

        if(!_.isEmpty(enumType)) {
          generateEventForMonth(enumType, month)
            .then(result => {
              resolve(`Events created for month ${month}`);
            })
            .catch(error => {
              reject(error);
            });     
        } else {
          reject('Impossible to create events, type of event unknown. Check documentation for accepted format.');
        }
      }
    });
  }
}

// Get alls events for a period (day, month or next)
let getEvents = function (serverId, period) {
  return new Promise((resolve, reject) => {
    let currentDate = moment();
    let year = currentDate.year();
    let month = months[currentDate.month()];
    let nextMonth = months[currentDate.month() + 1]; // maybe a bug here with December (11) + 1 // TODO: fix later
    let timestamp = currentDate.format('x'); // timestamp for currentDate

    let path = config.dataFolder + config.calendarFolder + '/' + serverId + '/' + year + '/' ;
    let pathCurrentMonth = path + _.lowerFirst(month) + '.json';
    let pathNextMonth = path + _.lowerFirst(nextMonth) + '.json'    
    
    if(fs.existsSync(pathCurrentMonth)) {
      // if calendar exist, get next event in the current month
      let rawdata = fs.readFileSync(pathCurrentMonth);
      let calendar = JSON.parse(rawdata);
      if(!_.isEmpty(calendar)) {        
        var events = listEvents(calendar, timestamp);
        formattedEvent(events, period)
          .then(result => { 
            resolve(result);
          })
          .catch(error => {
            reject(error);
          });
      }
    } else if (fs.existsSync(pathNextMonth)) {
      // else, get first event for next month
      let rawdata = fs.readFileSync(pathNextMonth);
      let calendar = JSON.parse(rawdata);
      if(!_.isEmpty(calendar)) {
        var events = listEvents(calendar, timestamp);
        formattedEvent(events, period)
          .then(result => { 
            resolve(result);
          })
          .catch(error => {
            reject(error);
          });
      }
    } else {
      reject('No data found');
    }
  });
}

let listEvents = function (calendar, timestamp) {
  return _.orderBy(_.filter(calendar, function(obj) {
    return timestamp <= obj.begin;
  }), ['begin'], ['asc']);
}

// Generate response for all events found
// events : List of events to show
// period : Day => only one event show, Month => all events set for current month
let formattedEvent = function (events, period) {
  return new Promise((resolve, reject) => {
    let eventString = '';

    if (_.isEqual(period, periods.month)) {
      events = _.orderBy(events, ['begin'], ['asc']);
      _.forEach(events, function (event) {      
        eventString += '\n```\n'
          + _.padEnd(' Evènement', 14)+ _.get(event, 'title', '') + '\n'
          + _.padEnd(' Jour', 14) + moment(_.get(event, 'begin')).format('DD/MM/YYYY') + '\n'
          + _.padEnd(' Début', 14) + moment(_.get(event, 'begin')).format('HH:mm').toString() + '\n'
          + _.padEnd(' Fin', 14) + moment(_.get(event, 'end')).format('HH:mm').toString() + '\n'
          + _.padEnd(' Groupage', 14) + moment(_.get(event, 'group')).format('HH:mm').toString() + '\n'
          + '```';
      });
    } else {
      let fieldsDate = [];
      if (_.isEqual(period, periods.next)) {
        if(moment(_.get(events, '0.begin')).isSame(moment().valueOf(), 'day')) {
          fieldsDate.push({ name: 'Jour', value: moment(_.get(events, '0.begin')).format('DD/MM/YYYY') });
          fieldsDate.push({ name: 'Début', value: moment(_.get(events, '0.begin')).format('HH:mm').toString(), inline: true });
          fieldsDate.push({ name: 'Fin', value: moment(_.get(events, '0.end')).format('HH:mm').toString(), inline: true });
          fieldsDate.push({ name: 'Groupage', value: moment(_.get(events, '0.group')).format('HH:mm').toString() });
        }
      } else if (_.isEqual(period, periods.day)) {
        fieldsDate.push({ name: 'Jour', value: moment(_.get(events, '0.begin')).format('DD/MM/YYYY') });
        fieldsDate.push({ name: 'Début', value: moment(_.get(events, '0.begin')).format('HH:mm').toString(), inline: true });
        fieldsDate.push({ name: 'Fin', value: moment(_.get(events, '0.end')).format('HH:mm').toString(), inline: true });
        fieldsDate.push({ name: 'Groupage', value: moment(_.get(events, '0.group')).format('HH:mm').toString(), });
      }
      fieldsDate.push({ name: 'Rappel', value: '_Pensez à répondre à l\'invitation en jeu, avant 20h, si cela n\'est pas déjà fait_' });

      let embedMessage = {};      
      _.set(embedMessage, 'color', 0x93c502);
      _.set(embedMessage, 'author.name', 'Way to Wype');
      _.set(embedMessage, 'author.icon_url', 'https://github.com/Arct4/way-to-wype-bot/raw/master/wtw_logo.png');
      _.set(embedMessage, 'thumbnail.url', _.get(events, '0.icon_url', ''));
      _.set(embedMessage, 'title', _.get(events, '0.title', ''));
      _.set(embedMessage, 'url', '');
      _.set(embedMessage, 'fields', fieldsDate);
      _.set(embedMessage, 'footer.text', '');

      eventString = embedMessage;
    }

    resolve(eventString);
  });
}

let generateEventForMonth = function (eventType, month) {
  return new Promise((resolve, reject) => {
    let year = moment().year();
    let path = config.dataFolder + config.calendarFolder + '/' + year + '/' ;
    let fullPath = path + _.lowerFirst(month) + '.json';
    let allEvents = [];

    if(fs.existsSync(fullPath)) {
      // Month already exist, just add or update event
      allEvents = JSON.parse(fs.readFileSync(fullPath));      
    }

    // New month or new data for events, creating events and save to a new file
    // Get default value for eventType
    // Need to get default days for type (Dungeon, Raid or HF)
    // For each default days, generate a event object with title, type, difficulty, group, begin and end informations
    let type = _.toLower(eventType.name);
    let defaultDays = _.get(config, 'defaultEvents.' + type + '.eventDay'); // Array of day ids
    let defaultDifficulty = _.find(enumEventDifficulty.eventDifficulty, function(idDifficulty) {
      return _.get(config, 'defaultEvents.' + type + '.eventDifficulty') === idDifficulty.id;
    });
    let defaultGroupHour = _.get(config, 'defaultEvents.' + type + '.hourGroup');
    let defaultBeginHour = _.get(config, 'defaultEvents.' + type + '.hourBegin');
    let defaultEndHour = _.get(config, 'defaultEvents.' + type + '.hourEnd');
    let iconUrl = _.get(config, 'defaultEvents.' + type + '.icon_url', '');

    // Need to get all days from defaultDays
    let allDays = [];
    _.forEach(defaultDays, function(day) {
      allDays.push(utils.getDaysForMonth(moment().month(month).day(day).toDate()));
    });

    if(!_.isEmpty(allDays)) {
      _.forEach(allDays, function (days) {      
        _.forEach(days, function (day) {
          // Get date from current day
          let momentDay = moment(day);

          // Create an event for each day in allDays array
          let eventCalendar = new Event();
          _.set(eventCalendar, 'title', eventType.name + ' ' + defaultDifficulty.name + ' (' + defaultDifficulty.alias + ')');              
          _.set(eventCalendar, 'eventDay', _.upperFirst(momentDay.format('dddd')));
          _.set(eventCalendar, 'eventDifficulty', defaultDifficulty.id);
          _.set(eventCalendar, 'eventType', eventType);
          _.set(eventCalendar, 'icon_url', iconUrl);

          _.set(eventCalendar, 'begin', moment(day).set({
            hour: moment(defaultBeginHour, 'HH:mm').get('hour'),
            minute: moment(defaultBeginHour, 'HH:mm').get('minute'),
            second: 0,
            millisecond: 0
          }).valueOf());

          _.set(eventCalendar, 'end', moment(day).set({
            hour: moment(defaultEndHour, 'HH:mm').get('hour'),
            minute: moment(defaultEndHour, 'HH:mm').get('minute'),
            second: 0,
            millisecond: 0
          }).valueOf());

          _.set(eventCalendar, 'group', moment(day).set({
            hour: moment(defaultGroupHour, 'HH:mm').get('hour'),
            minute: moment(defaultGroupHour, 'HH:mm').get('minute'),
            second: 0,
            millisecond: 0
          }).valueOf());

          // Add events to allEvents list if not exist
          let existEvent = _.find(allEvents, function (event) {
            return ((event.name === eventCalendar.name) && (event.begin === eventCalendar.begin) 
                    && (event.end === eventCalendar.end) && (event.group == eventCalendar.group));
          });
          if(!existEvent) {
            allEvents.push(eventCalendar);
          }
        });
      });

      if(!_.isEmpty(allEvents)) {
        // update json file for month
        fs.writeFileSync(fullPath, JSON.stringify(allEvents, null, 2), function (err) {
          if (err) {
            logger.error(err);
            reject(err);
          }
        });
      }

      resolve('Events created');
    }
  });
}