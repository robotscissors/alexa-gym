"use strict";
//add analytics code
var express = require('express');
var request = require('request');
var Alexa = require('alexa-sdk');
var doc = require('dynamodb-doc');
var app = express();

var APP_ID = "amzn1.ask.skill.5091e1a5-fb91-45aa-bf14-5b6dc4dc29a7";
var tableName = "GymTracker3";
var dynamo = new doc.DynamoDB();
var GA_TRACKING_ID = 'UA-102762030-1';

var repromptText = "For instructions on what you can say, please say help me.";
var helpPhrase = "You can say things like... I'm going to the gym!... or ... How many times have I been to the gym this month? ... Or how many times have I been to the gym since January 2017?... You can also say reset gym tracker to reset all data.";


function trackEvent(category, action, label, value, callbback) {
  var data = {
    v: '1', // API Version.
    tid: GA_TRACKING_ID, // Tracking ID / Property ID.
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: '555',
    t: 'event', // Event hit type.
    ec: category, // Event category.
    ea: action, // Event action.
    el: label, // Event label.
    ev: value, // Event value.
  };

  request.post(
    'http://www.google-analytics.com/collect', {
      form: data
    },
    function(err, response) {
      if (err) { return callbback(err); }
      if (response.statusCode !== 200) {
        return callbback(new Error('Tracking failed'));
      }
      callbback();
    }
  );
}



exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.dynamoDBTableName = 'GymTracker_state'; //holds variables in state like timezone
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {

    'LaunchRequest': function () {
        if (this.attributes['timeZone']) {  // has timezone already been set for this user?
            this.emit('WelcomeIntent');
          } else {
            // ask for timezone
            this.attributes['timeZone-offset'] = -8;
            console.log('set timezone');
            
            this.emit('WelcomeIntent');
          }

    },

    'WelcomeIntent': function () {

        this.emit(':ask', 'Are you off to the gym... yes or no?', repromptText);
    },

    'AreYouGoingIntent': function () {

        var areYouGoing = this.event.request.intent.slots.AreYouGoingSlot.value;
        var userID = this.event['session']['user']['userId'];
        var self = this;
        var gymDate = new Date();
        var lastDate = "";
        var currentDate = formatDate(gymDate);
        var responseProblem = 'What can I help you with? Say HELP for a list of commands';
        var responseDuplicate = 'Hmm.... It looks like you already told me you went to the gym. Say help for additional commands';
        var responseOK = 'Keep up the great work! I made a note of this.';
        var responseNegative = 'Why are you telling me?';

        var params = {
            TableName : tableName,
            KeyConditionExpression: "#user = :userID",
            ExpressionAttributeNames:{
                "#user": "userId"
            },
            ExpressionAttributeValues: {
                ":userID":userID
            }
        };

        trackEvent(
          'Intent',
          'AMAZON.SetGoingToGymIntent',
          'na',
          '100',
          function(err) {
            if (err) {
                return next(err);
            }


            switch (areYouGoing) {
              case 'yes':
                console.log("response is yes");
                dynamo.query(params, function(err, data) {
                    if (err) {
                        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));

                    } else {
                      var total = data.Items.length;
                      if (total>0) {
                        console.log("total Records: "+ total);
                        lastDate = formatDate(new Date(data.Items[total-1].dateAtGym));
                        console.log("Last date: "+lastDate + " Today's Date: "+ currentDate);
                      } else {
                        lastDate = "";
                      }
                    }
                });

                // check to see if they are the same.
                if (lastDate === currentDate) {
                  self.emit(':ask', responseDuplicate, repromptText);
                } else {
                  dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: gymDate.getTime()}},
                  function(err, data) {
                    if (err)
                        console.log(err, err.stack); // an error occurred
                    else
                        self.emit(':tell', responseOK);
                        console.log(data);
                    });
                }
                  break;
              case 'no':
                  self.emit(':tell', responseNegative);
                  break;
              default:
                  self.emit(':ask', responseProblem, repromptText);
                  break;
              }
          });
    },

    'SetGoingToGymIntent': function () {
      // insert into datatbase that you are going to the gym
       var gymDate = new Date();
       var userID = this.event['session']['user']['userId'];
       var self = this;
       var responseOK = "Good job! I have marked it down.";

       trackEvent(
         'Intent',
         'AMAZON.SetGoingToGymIntent',
         'na',
         '100',
         function(err) {
           if (err) {
               return next(err);
           }
           dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: gymDate.getTime()}},
            function(err, data) {
             if (err) {
                 console.log(err, err.stack); // an error occurred
              } else {
                 console.log("You are going to the gym - let's mark it down");
                 self.emit(':tell', responseOK);
              }

            });
        });
    },

    'GetLastTimeAtGymIntent': function () {
        //read database to find out when you went to the gym last
        console.log("calculating last time I was at the gym");
        var userID = this.event['session']['user']['userId'];
        var responseBuild = "";
        var self = this;
        var params = {
            TableName:tableName,
            //KeyConditionExpression: "#userCheck < :currentUser",
            KeyConditionExpression: "#userCheck = :currentUser",
            ExpressionAttributeNames: {
                "#userCheck": "userId"
            },
            ExpressionAttributeValues: {
                ":currentUser": userID
            }

          };
          trackEvent(
            'Intent',
            'AMAZON.GetLastTimeAtGymIntent',
            'na',
            '100',
            function(err) {
              if (err) {
                  return next(err);
              }
              dynamo.query(params, function(err, data) {
                  if (err) {
                      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                      responseBuild = "Hmmm. I am not sure, there may be a problem or you haven't gone to the gym yet.";
                  } else {
                      var total = data.Items.length;
                      var retrievedDate = formatDate(new Date(data.Items[total-1].dateAtGym));
                      console.log("Query succeeded. Your last visit was "+ retrievedDate);
                      //console.log("Query succeeded. Your last visit was "+ formatDate(data.Items[total-1].dateAtGym));
                      responseBuild = 'Your last visit was '+ retrievedDate;
                  }
                      self.emit(':tell', responseBuild);
              });
          });
    },

    'GetNumberOfTotalVisitsIntent': function () {
      //query database to find out how many times you went to the gym
      var self = this;
      var userID = this.event['session']['user']['userId'];
      var responseBuild = "";
      var params = {
          TableName:tableName,
          //FilterExpression: "#userCheck = :currentUser",
          KeyConditionExpression: "#userCheck = :currentUser",
          ExpressionAttributeNames: {
              "#userCheck": "userId",
          },
          ExpressionAttributeValues: {
               ":currentUser": userID
          }
        };

      trackEvent(
        'Intent',
        'AMAZON.GetNumberOfTotalVisitsIntent',
        'na',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }

          dynamo.query(params, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                } else {
                    var total = data.Items.length;
                    var retrievedDate = new Date(data.Items[total-1].dateAtGym);

                    if (total > 0) {
                      console.log("Query succeeded. Total: "+total+" your last visit was "+ formatDate(retrievedDate));
                      if (total>1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ formatDate(retrievedDate);
                      } else if (total===1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ formatDate(retrievedDate) +' ... Seriously? I can\'t believe you asked me!';
                      }
                    } else {
                      console.log("It's less than zero!!");
                      responseBuild = 'There has been an error - Are you sure you have been to the gym?... ever?';
                    }
                    self.emit(':tell', responseBuild);
                }
          });
        });
    },

    'GetNumberOfVisitsSinceDateIntent': function () {

      var sinceDate = this.event.request.intent.slots.SinceDateSlot.value;
      var userID = this.event['session']['user']['userId'];
      var self = this;
      var responseError = "The way you phrased the date is incorrect. I can answer your question if you tell me a specific day or say a month. For example, how many times did I go to the gym since last month. Try again?";
      var responseBuild = "";

      // handle a Date convert to getTime for comparison
      var compareDate = new Date(sinceDate).getTime();
      var currentDate = new Date().getTime();

      trackEvent(
        'Intent',
        'AMAZON.GetNumberOfVisitsSinceDateIntent',
        'na',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }
          // how many times did you go the gym since.

            if (([ 'W', 'X', 'S', 'F', 'A' ].indexOf(sinceDate) <= -1) && (sinceDate != undefined) && (compareDate <= currentDate )) { //unsupported date formats
              // let's query the database
              var params = {
                  TableName : tableName,
                  KeyConditionExpression: "#user = :userID AND stampId >= :timeSince",
                  ExpressionAttributeNames:{
                      "#user": "userId"
                  },
                  ExpressionAttributeValues: {
                      ":userID":userID,
                      ":timeSince": compareDate
                  }
              };

              dynamo.query(params, function(err, data) {
                  if (err) {
                      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                  } else {
                      var total = data.Items.length;
                      console.log(JSON.stringify(data.Items,null,2));
                      var retrievedDate = formatDate(new Date(data.Items[total-1].dateAtGym));

                      console.log("Query succeeded. Total: "+total+" your last visit was "+retrievedDate);
                      if (total>1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ retrievedDate;
                      };
                      if (total===1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ retrievedDate+' ... Seriously? I can\'t believe you asked me!';
                      };

                      self.emit(':tell', responseBuild);
                  }
              });
             } else {
              //it's a date that requires more manipulation
               self.emit(':ask', responseError, repromptText);
             }
      });
    },

    'ResetGymCountIntent': function () {
      //Reset the gym count in the database
      var self = this;
      var userID = this.event['session']['user']['userId'];
      var responseOK = 'Resetting the gym count.';
      var params = {
          TableName:tableName,
          KeyConditionExpression: "#userCheck = :currentUser",
          ExpressionAttributeNames: {
              "#userCheck": "userId",
          },
          ExpressionAttributeValues: {
               ":currentUser": userID
          }
      };

      trackEvent(
        'Intent',
        'AMAZON.ResetGymCount',
        'na',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }

          console.log("removing data for user");


              // look for all items and build array
              dynamo.query(params, function(err, data) {
                  if (err) {
                      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                  } else {
                      console.log("Query succeeded.");
                      data.Items.forEach(function(item) {
                          console.log(" -", item.stampId + ": " + item.userId);
                      });
                      data.Items.forEach(function(item) {
                        // got through the array
                        var params = {
                              TableName:tableName,
                              Key:{
                                  stampId: item.stampId,
                                  userId: item.userId
                                }
                          };
                          dynamo.deleteItem(params, function(err, data) {
                              if (err) {
                                  console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                              } else {
                                  console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                                  self.emit(':tell', responseOK);
                              }
                          });
                      });
                  }
              });

          });
    },

    'AMAZON.HelpIntent': function () {
      var self = this;
      trackEvent(
        'Intent',
        'AMAZON.HelpIntent',
        'na',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }
          //var speechOutput = "Okay.";
          //response.tell(speechOutput);
          self.emit(':ask', helpPhrase, repromptText);
        });
    },

    "AMAZON.NoIntent": function () {
        var self = this;
        var noIntentPhrase = "Okay...";
        trackEvent(
          'Intent',
          'AMAZON.NoIntent',
          'na',
          '100', // Event value must be numeric.
          function(err) {
            if (err) {
                return next(err);
            }
          self.emit(':tell', noIntentPhrase);
          });
    },

    'Unhandled': function () {
        var self = this;
        var unhandledPhrase = "Are You are having trouble? You can ask how many times you have been to the gym, or say reset gym tracker to reset all data... If you are going to the gym, just say, I\'m off to the gym!";
        trackEvent(
          'Intent',
          'AMAZON.unhandled',
          'na',
          '100',
          function(err) {
            if (err) {
                return next(err);
            }
            self.emit(':ask', unhandledPhrase, repromptText);
          });
    }




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
