"use strict";

var Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context, callback);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//handlers with intent
var handlers = {
    'LaunchRequest': function () {
        this.emit('Welcome Intent');
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
    }
 };
