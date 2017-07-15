"use strict";
console.log ("gym tracker started");
var APP_ID = "amzn1.ask.skill.5091e1a5-fb91-45aa-bf14-5b6dc4dc29a7";
var Alexa = require('alexa-sdk');
var tableName = "GymTracker";
var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();


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
        var userID = this.event['session']['user']['userId'];
        switch (areYouGoing) {
          case 'yes':
            this.emit(':tell', 'Good job...  Your response is ' + areYouGoing);

            var gymDate = Date.now();
            //console.log('You are at the gym: '+ gymDate);
            dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate, userId : userID, dateAtGym: gymDate}},
             function(err, data) {
              if (err)
                  console.log(err, err.stack); // an error occurred
              else
                  console.log(data);
              });
              break;
            case 'no':
              this.emit(':tell', 'Why are you telling me?');
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
        console.log("removing data for user");
        this.emit(':tell', 'Resetting the gym count.');
        var userID = this.event['session']['user']['userId'];
        var params = {
            TableName:tableName,
            FilterExpression: "#userCheck = :currentUser",
            ExpressionAttributeNames: {
                "#userCheck": "userId",
            },
            ExpressionAttributeValues: {
                 ":currentUser": userID
            }
          };
            console.log(JSON.stringify(params,null,2));
            dynamo.scan(params, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                } else {
                    console.log("Query succeeded.");
                    data.Items.forEach(function(item) {
                        console.log(" -", item.stampId + ": " + item.userId);
                    });
                    data.Items.forEach(function(item) {
                      var params = {
                            TableName:tableName,
                            Key:{
                                stampId: item.stampId,
                                userId: item.userId
                              }
                        };
                        console.log(JSON.stringify(params,null,2));
                        dynamo.deleteItem(params, function(err, data) {
                            if (err) {
                                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                            } else {
                                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                            }
                        });


                    });

                }
            });



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
