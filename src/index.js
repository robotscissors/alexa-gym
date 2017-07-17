"use strict";


var APP_ID = "amzn1.ask.skill.5091e1a5-fb91-45aa-bf14-5b6dc4dc29a7";
var Alexa = require('alexa-sdk');
var tableName = "GymTracker3";
var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
var repromptText = "For instructions on what you can say, please say help me.";

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {

    'LaunchRequest': function () {
        this.emit('WelcomeIntent');
    },

    'WelcomeIntent': function () {
        this.emit(':ask', 'Are you off to the gym... yes or no?', repromptText);
    },

    'AreYouGoingIntent': function () {
        var areYouGoing = this.event.request.intent.slots.AreYouGoingSlot.value;
        var userID = this.event['session']['user']['userId'];

        switch (areYouGoing) {
          case 'yes':
            this.emit(':tell', 'Keep up the great work! I made a note of this.');
            var gymDate = new Date();
            dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: formatDate(gymDate)}},
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
              this.emit(':ask', 'What can I help you with? Say HELP for a list of commands', repromptText);
              break;
          }
    },

    'SetGoingToGymIntent': function () {
      // insert into datatbase that you are going to the gym
       var gymDate = new Date();
       var userID = this.event['session']['user']['userId'];
       var self = this;
       var okResponse = "Good job! I have marked it down.";

       dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: formatDate(gymDate)}},
        function(err, data) {
         if (err) {
             console.log(err, err.stack); // an error occurred
          } else {
             console.log(data);
             console.log("You are going to the gym - let's mark it down");
             self.emit(':tell', okResponse);
          }

         });
    },

    'GetLastTimeAtGymIntent': function () {
        //read database to find out when you went to the gym last
        console.log("calculating last time I was at the gym");
        var userID = this.event['session']['user']['userId'];
        var response = "";
        var params = {
            TableName:tableName,
            //KeyConditionExpression: "#userCheck < :currentUser",
            FilterExpression: "#userCheck = :currentUser",
            ExpressionAttributeNames: {
                "#userCheck": "userId"

            },
            ExpressionAttributeValues: {
                ":currentUser": userID

            }

          };
        var self = this;
        dynamo.scan(params, function(err, data) {
            var response = "";
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                response = "Hmmm. I am not sure, there may be a problem or you haven't gone to the gym yet."
            } else {
                var total = data.Items.length;

                console.log("Query succeeded. Your last visit was "+data.Items[total-1].dateAtGym);
                response = 'Your last visit was '+ data.Items[total-1].dateAtGym;
            }
                self.emit(':tell', response);
        });
    },

    'GetNumberOfTotalVisitsIntent': function () {
      //query database to find out how many times you went to the gym
        console.log("calculating total number of visits");
        var userID = this.event['session']['user']['userId'];
        var response = "";
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
            var self = this;


            dynamo.scan(params, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                } else {
                    var total = data.Items.length;
                    var response = "";
                    console.log("total: "+total);
                    if (total > 0) {
                      console.log("Query succeeded. Total: "+total+" your last visit was "+data.Items[total-1].dateAtGym);
                      if (total>1){
                        response = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ data.Items[total-1].dateAtGym;
                      } else if (total===1){
                        response = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ data.Items[total-1].dateAtGym+' ... Seriously? I can\'t believe you asked me!';
                      }
                    } else {
                      console.log("It's less than zero!!");
                      response = 'There has been an error - Are you sure you have been to the gym?... ever?';
                    }
                    self.emit(':tell', response);
                }
            });
    },

    'ResetGymCountIntent': function () {
      //Reset the gym count in the database
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
      // how many times did you go the gym since.
      var sinceDate = this.event.request.intent.slots.SinceDateSlot.value;
      // handle a Date convert to getTime for comparison
      try {
      //if (!sinceDate.includes("W") ) {
      if (([ 'W', 'X', 'S', 'F', 'A' ].indexOf(sinceDate) <= -1) && (sinceDate != undefined)) { //unsupported date formats
        // convert date to time stamp for comparison
        var compareDate = new Date(sinceDate);
        console.log (compareDate.getTime());
        // let's query the database
        var userID = this.event['session']['user']['userId'];
        var self = this;
        var params = {
            TableName : tableName,
            KeyConditionExpression: "#user = :userID AND stampId >= :timeSince",
            ExpressionAttributeNames:{
                "#user": "userId"
            },
            ExpressionAttributeValues: {
                ":userID":userID,
                ":timeSince": compareDate.getTime()
            }
        };
        console.log("start query on: "+compareDate.getTime() );
        dynamo.query(params, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                var total = data.Items.length;
                var response = "";
                console.log("Query succeeded. Total: "+total+" your last visit was "+data.Items[total-1].dateAtGym);
                if (total>1){
                  response = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ data.Items[total-1].dateAtGym;
                };
                if (total===1){
                  response = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ data.Items[total-1].dateAtGym+' ... Seriously? I can\'t believe you asked me!';
                };

                self.emit(':tell', response);
            }
        });
       } else {
        //it's a date that requires more manipulation
         this.emit(':ask', 'The way you phrased the date is incorrect. I can answer your question if you tell me a specific day or say a month. For example, how many times did I go to the gym since last month. Try again?', repromptText);
       }
    } catch(err) {
      this.emit(':ask', 'The way you phrased the date is incorrect. I can answer your question if you tell me a specific day or say a month. For example, how many times did I go to the gym since last month. Try again?', repromptText);
    };
    },

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'you can say things like... how many times have I been to the gym this month? ... Or how many times have I been to the gym this since January?... You can also say reset gym tracker to reset all data.', repromptText);
    },

    'Unhandled': function () {
        this.emit(':ask', 'Are You are having trouble? You can ask how many times you have been to the gym, or say reset gym tracker to reset all data... If you are going to the gym, just say, I\'m off to the gym!', repromptText);
    },
 };

 function formatDate(date) {
   var monthNames = [
     "January", "February", "March",
     "April", "May", "June", "July",
     "August", "September", "October",
     "November", "December"
   ];

   var day = date.getDate();
   var monthIndex = date.getMonth();
   var year = date.getFullYear();

   return monthNames[monthIndex] + ' ' + day + ', ' + year;
 }
