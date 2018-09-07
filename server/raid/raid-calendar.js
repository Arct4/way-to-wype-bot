const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');
const moment = require('moment');

const config = require('../config.json');

// Configure logger settings
logger.level = config.loggerLevel;

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const periods = { day: 'day', month: 'month', next: 'next' };

module.exports = {
  // Get Next event
  raidEventNext: function() {
    return new Promise((resolve, reject) => {
      getEvents(periods.day)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  // Get all events for current month
  raidEventMonth: function() {
    return new Promise((resolve, reject) => {
      getEvents(periods.month)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  },

  nextDateEvent: function() {
    return new Promise((resolve, reject) => {
      getEvents(periods.next)
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
          _.set(config, 'defaultNotifyChannel', args[0]);

          // update json file for player
          fs.writeFileSync(path, JSON.stringify(config, null, 2), function (err) {
            if (err) {
              logger.error(err);
              reject(err);
            }
          });

          resolve(`Default channel set to ${args[0]}`);
        }
      }
    });
  }
}

let getEvents = function (period) {
  return new Promise((resolve, reject) => {
    let currentDate = moment();
    let year = currentDate.year();
    let month = months[currentDate.month()];
    let nextMonth = months[currentDate.month() + 1]; // maybe a bug here with December (11) + 1 // TODO: fix later
    let timestamp = currentDate.format('x'); // timestamp for currentDate

    let path = config.dataFolder + config.calendarFolder + '/' + year + '/' ;
    let pathCurrentMonth = path + _.lowerFirst(month) + '.json';
    let pathNextMonth = path + _.lowerFirst(nextMonth) + '.json'    
    
    if(fs.existsSync(pathCurrentMonth)) {
      // if calendar exist, get next event in the current month
      let rawdata = fs.readFileSync(pathCurrentMonth);
      let calendar = JSON.parse(rawdata);
      if(!_.isEmpty(calendar)) {        
        var events = listEvents(calendar, timestamp);
        if(_.isEqual(period, periods.next)) {
          resolve(_.first(events));
        } else {
          formattedEvent(events, period)
            .then(result => { 
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        }
      }
    } else if (fs.existsSync(pathNextMonth)) {
      // else, get first event for next month
      let rawdata = fs.readFileSync(pathNextMonth);
      let calendar = JSON.parse(rawdata);
      if(!_.isEmpty(calendar)) {
        var events = listEvents(calendar, timestamp);
        if(_.isEqual(period, periods.next)) {
          resolve(_.first(events));
        } else {
          formattedEvent(events, period)
            .then(result => { 
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        }
      }
    } else {
      reject('No data found');
    }
  });
}

let listEvents = function (calendar, timestamp) {
  return _.filter(calendar, function(obj) {
    return timestamp <= obj.begin;
  });
}

// Generate response for all events found
// events : List of events to show
// period : Day => only one event show, Month => all events set for current month
let formattedEvent = function (events, period) {
  return new Promise((resolve, reject) => {
    let eventString = '';

    if(_.isEqual(period, periods.day)) {
      eventString += '\n```\n'
        + _.padEnd(' Evènement', 14)+ _.get(events, '0.title', '') + '\n'
        + _.padEnd(' Jour', 14) + moment(_.get(events, '0.begin')).format('DD/MM/YYYY') + '\n'
        + _.padEnd(' Début', 14) + moment(_.get(events, '0.begin')).format('HH:mm').toString() + '\n'
        + _.padEnd(' Fin', 14) + moment(_.get(events, '0.end')).format('HH:mm').toString() + '\n'
        + '```';
    } else if(_.isEqual(period, periods.month)) {    
      _.forEach(events, function (event) {      
        eventString += '\n```\n'
          + _.padEnd(' Evènement', 14)+ _.get(event, 'title', '') + '\n'
          + _.padEnd(' Jour', 14) + moment(_.get(event, 'begin')).format('DD/MM/YYYY') + '\n'
          + _.padEnd(' Début', 14) + moment(_.get(event, 'begin')).format('HH:mm').toString() + '\n'
          + _.padEnd(' Fin', 14) + moment(_.get(event, 'end')).format('HH:mm').toString() + '\n'
          + '```';
      });
    } else {
      reject('No entry available');
    }

    resolve(eventString);
  });
}