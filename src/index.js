"use strict";
var APP_ID = "amzn1.ask.skill.5091e1a5-fb91-45aa-bf14-5b6dc4dc29a7";
var Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//handlers with intent
var handlers = {
    'LaunchRequest': function () {
        this.emit('WelcomeIntent');
    },

    'WelcomeIntent': function () {
        this.emit(':ask', 'Are you off to the gym... yes or no... or say help for other options?');
    },

    'AreYouGoingIntent': function () {
        var areYouGoing = this.event.request.intent.slots.AreYouGoingSlot.value;
        switch (areYouGoing) {
          case 'yes':
            this.emit(':tell', 'Good job... Go Get EM!! Your response is ' + areYouGoing);
            break;
          default:
            this.emit(':ask', 'What can I help you with? Say HELP for a list of commands');
            break;
          }
    },


    'SetGoingToGymIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'Write to database!');
    },

    'SetGoingToGymIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'Write to database!');
    },

    'GetLastTimeAtGymIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'Last time at gym was...');
    },

    'GetNumberOfTotalVisitsIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'Total number of visits from database!');
    },

    'ResetGymCountIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'Reset the gym count.');
    },

    'GetNumberOfVisitsSinceDateIntent': function () {
      //do something amazing error capture?
        this.emit(':tell', 'You haven\'t been to the gym since..');
    },

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'you can say things like how many times have I been to the gym this month, or say reset gym tracker to reset all data');
    },

    'Unhandled': function () {
        this.emit(':tell', 'You are having trouble.');
    },
 };
