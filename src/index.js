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
        this.emit(':tell', 'Started Gym Application');
    },

    'WelcomeIntent': function () {
        this.emit(':tell', 'Started Gym Application');
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
        this.emit(':tell', 'Just tell me you are going to the gym and I will make note of it. If you want to know how many times you have been to them, just ask ... how many times have I been to the gym?');
    },

    'Unhandled': function () {
        this.emit(':tell', 'You are having trouble.');
    },
 };
