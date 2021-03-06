# Way to Wype Bot for Discord

Little Discord Bot developed with [Node.js](https://nodejs.org/en/) and [Discord.io API](https://github.com/izy521/discord.io) for Way to Wype guild.

[![NPM](https://img.shields.io/npm/v/discord.io.svg)](https://img.shields.io/npm/v/gh-badges.svg)

## About Way to Wype

![Way to Wype Logo](wtw_logo.png)

[Way to Wype](http://eu.battle.net/wow/fr/guild/elune/Way_to_Wype/) is a French guild on Elune-EU Server.

You can send a private message to Arctarus#2334 to get more informations and an invite to our Discord server.

## Built With

* [Node.js](https://nodejs.org/en/)
* [Discord.io](https://github.com/izy521/discord.io)
* [Blizzard API](https://dev.battle.net)

## Requirments

If you want to use functionnaly of this bot, you need to add an **auth.json** config file in the root folder and add your API Key for Discord and Blizzard API.

```json
{
  "token": "YOUR-DISCORD-API-TOKEN",
  "wowApiKey": "YOUR-BLIZZARD-API-TOKEN"
}
```
_Note : Don't add the auth.json in your repository, it's your private data !_

## Contributing

You can contact me to contribute to this bot and if you want more command.

## Authors

* **Arctarus** - *Initial work* - [Arct4](https://github.com/Arct4)

See also the list of [contributors](https://github.com/Arct4/way-to-wype-bot/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## TODO List

* Calendar
  * [x] See events with `!raid-event-next` `!raid-event-month`
    * [x] `!raid-event-next` return an embed message
  * [x] Add raids events for given month with `!calendar-month-event raid october`
    * _Work with some alias set in enum EventType.json_
    * _Work with month in English atm_ 
    * _Need to add some default config in **config.json** file_
  * [x] Add dungeons events with `!calendar-month-event dungeon october`
    * _Work with some alias set in enum EventType.json_
  * [x] Add HFs events with `!calendar-month-event HF october`
    * _Work with some alias set in enum EventType.json_
  * [x] Send automatic message when an event occur in a day (_set a default channel to send message needed_)
* Member
  * [x] Update Class and Role from Armory
  * [ ] Add roster's members with a specific rank (like Guild Master or Roster)
  * [ ] Add data about gems and enchants for roster's members or a specific player  
  * [x] Add chart to see Raider.IO score, and each better key down for a character
* Guide
  * [ ] Found on Wowhead, Icy Veins or other site a guide for class or profession
* Improvement
  * [x] Welcome message send in DM with custom message
  * [x] Set a default channel to answer
  * [x] Let user set a custom prefix for command
  * [x] Send bot's answer with multipart messages to avoid Discord limit (2000 characters)  
  * [x] Use channels objects for default channel (*#my_channel*), not a string (*my_channel*)
  * [x] On role update, can send a private message to the user to explain the new access
  * [ ] Add translation management
  * [ ] Upgrade Calendar management
    * [ ] Edit specific event
    * [ ] Add icon's url for an event (*to identify the event like Uldir or TD or AD for example*)
  * [x] Work on multiple server
    * [x] Calendar management
    * [x] DM management (welcome and roles)
    * [x] Roster's members management
* Docs
  * [ ] Add docs for each command available
