const _ = require('lodash');
const logger = require('winston');
const fs = require('fs');
const moment = require('moment');

const config = require('../config.json');

// Configure logger settings
logger.level = config.loggerLevel;

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

module.exports = {
  raidEventNext: function() {
    return new Promise((resolve, reject) => {
      let msg = '';
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
          var event = _.first(listEvents(calendar, timestamp));
          formattedEvent(event)
            .then(result => { 
              msg = result;
            })
        }
      } else if (fs.existsSync(pathNextMonth)) {
        // else, get first event for next month
        let rawdata = fs.readFileSync(pathNextMonth);
        let calendar = JSON.parse(rawdata);
        if(!_.isEmpty(calendar)) {
          var event = _.first(listEvents(calendar, timestamp));
          formattedEvent(event)
            .then(result => { 
              msg = result;
            })
        }
      } else {
        msg = 'No data found';
      }

      logger.info(`!ren msg value : ${msg}`);
      resolve(msg);
    });
  },

  raidEventMonth: function() {
    return new Promise((resolve, reject) => {
      let msg = '';
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
          formattedEvent(events)
            .then(result => { 
              msg = result;
            })
        }
      } else if (fs.existsSync(pathNextMonth)) {
        // else, get first event for next month
        let rawdata = fs.readFileSync(pathNextMonth);
        let calendar = JSON.parse(rawdata);
        if(!_.isEmpty(calendar)) {
          var events = listEvents(calendar, timestamp);
          formattedEvent(events)
            .then(result => { 
              msg = result;
            })
        }
      } else {
        msg = 'No data found';
      }

      logger.info(`!rem msg value : ${msg}`);
      resolve(msg);
    });
  },

  raidEventForMonth: function(args) {

  }
}

let listEvents = function (calendar, timestamp) {
  return _.filter(calendar, function(obj) {
    return timestamp <= obj.begin;
  });
}

let formattedEvent = function (events) {
  return new Promise((resolve, reject) => {
    let eventString = '';

    _.forEach(events, function (event) {      
      eventString += '\n```\n'
                + _.padEnd(' Evènement', 14)+ _.get(event, 'title', '') + '\n'
                + _.padEnd(' Jour', 14) + moment(_.get(event, 'begin')).format('DD/MM/YYYY') + '\n'
                + _.padEnd(' Début', 14) + moment(_.get(event, 'begin')).format('HH:mm').toString() + '\n'
                + _.padEnd(' Fin', 14) + moment(_.get(event, 'end')).format('HH:mm').toString() + '\n'
                + '```';
    });

    resolve(eventString);
  });
}