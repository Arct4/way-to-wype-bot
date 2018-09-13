const _ = require('lodash');
const logger = require('winston');

const config = require('../config.json');

// Configure logger settings
logger.level = config.loggerLevel;

module.exports = class EventCalendar {
  constructor() {
    this.title = "";
    this.begin = 0;
    this.end = 0;
    this.group = 0;
    this.eventDay = 0;
    this.eventDifficulty = 0;
    this.eventType = 0;
  }
}