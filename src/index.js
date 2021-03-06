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
var helpPhrase = "You can say things like... I'm going to the gym!... or ... How many times have I been to the gym this month? ... Or how many times have I been to the gym since January 2017?... You can also say ..reset gym tracker to erase your gym data.";


function trackEvent(category, action, cidName, label, value, callbback) {
  var data = {
    v: '1', // API Version.
    tid: GA_TRACKING_ID, // Tracking ID / Property ID.
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: cidName,
    t: 'event', // Event hit type.
    ec: category, // Event category.
    ea: action, // Event action.
    el: label, // Event label.
    ev: value, // Event value.
  };
  console.log("post data: "+ JSON.stringify(data,null,2));
  request.post(
    'http://www.google-analytics.com/collect', {
      form: data
    },
    function(err, response) {
      if (err) {
        console.log(err);
        return callbback(err);
      }
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
        var userID = this.event['session']['user']['userId'];
        var self = this;
        if (self.attributes['timeZone']) {  // has timezone already been set for this user?
          trackEvent(
            'Intent',
            'AMAZON.LaunchRequest',
            userID,
            'Launch User - saved TimeZone',
            '100',
            function(err) {
              if (err) {
                  return next(err);
              }
              self.emit('WelcomeIntent');
            });
          } else {
            trackEvent(
              'Intent',
              'AMAZON.LaunchRequest',
              userID,
              'New User - no saved TimeZone',
              '100',
              function(err) {
                if (err) {
                    return next(err);
                }
            // ask for timezone
              self.emit(':ask', 'To get started, please tell me your timezone. You can say Pacific timezone...Mountain timezone...Central timezone...or Eastern timezone....What time zone are you in?');
              console.log('set timezone');
            });

          }

    },

    'WelcomeIntent': function () {
      var userID = this.event['session']['user']['userId'];
      var self = this;

      if (checkForTimeZone(self)) { return; }

      trackEvent(
        'Intent',
        'AMAZON.SetTimeZoneIntent',
        userID,
        'Welcome Prompt',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }
          self.emit(':ask', 'Are you off to the gym... yes or no?', repromptText);
        });

    },


    'WhichTimeZoneIntent': function () {
      var timeZoneResponse = this.event.request.intent.slots.TimeZoneSlot.value;
      var userID = this.event['session']['user']['userId'];
      var self = this;
      var responseTimeZone = "";
      console.log("TimeZoneSlot: "+timeZoneResponse);

      trackEvent(
        'Intent',
        'AMAZON.SetTimeZoneIntent',
        userID,
        'Setting TimeZone',
        '100',
        function(err) {
          if (err) {
              return next(err);
          }
          switch (timeZoneResponse) {
            case "pacific":
              responseTimeZone = "You have selected Pacific TimeZone.... Have you gone to the gym, today?";
              self.attributes['timeZone'] = -8;
              break;
            case "mountain":
              responseTimeZone = "You have selected Mountain TimeZone.... Have you gone to the gym, today?";
              self.attributes['timeZone'] = -7;
              break;
            case "central":
              responseTimeZone = "You have selected Central TimeZone.... Have you gone to the gym, today?";
              self.attributes['timeZone'] = -6;
              break;
            case "eastern":
              responseTimeZone = "You have selected Eastern TimeZone.... Have you gone to the gym, today?";
              self.attributes['timeZone'] = -5;
              break;
            default :
              responseTimeZone = "Hmmmm..... I didn't get that. To get started, please tell me your timezone. You can say Pacific timezone...Mountain timezone...Central timezone...or Eastern timezone.... What time zone are you in?";
          }

          self.emit(':ask', responseTimeZone);
      });
    },


    'AreYouGoingIntent': function () {

        var areYouGoing = this.event.request.intent.slots.AreYouGoingSlot.value;
        var userID = this.event['session']['user']['userId'];
        var self = this;
        var responseProblem = 'What can I help you with? Say HELP for a list of commands';
        var responseNegative = 'Ok.... well let me know when you do go to the gym so I can make a note of it. I mean, that\'s the point, right?';

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

      if (checkForTimeZone(self)) { return; }

        trackEvent(
          'Intent',
          'AMAZON.SetGoingToGymIntent',
          userID,
          'Update Gym Total',
          '100',
          function(err) {
            if (err) {
                return next(err);
            }


            switch (areYouGoing) {
              case 'yes':
                console.log("response is yes");
                insertNewDate(params, userID, self);

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
       var currentDate = formatDate(gymDate);
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

      if (checkForTimeZone(self)) { return; }

       trackEvent(
         'Intent',
         'AMAZON.SetGoingToGymIntent',
         userID,
         'Update Gym Total - no Yes or No',
         '100',
         function(err) {
           if (err) {
               return next(err);
           }
           // check to see if there are any entries
          insertNewDate(params, userID, self);

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

      if (checkForTimeZone(self)) { return; }

          trackEvent(
            'Intent',
            'AMAZON.GetLastTimeAtGymIntent',
            userID,
            'Last Time at Gym Query',
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
                      var retrievedDate = formatDate(new Date(data.Items[total-1].dateAtGym + (1000*60*60*self.attributes['timeZone'])));
                      console.log("Query succeeded. Your last visit was "+ retrievedDate);
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

        if ((self.attributes['timeZone']) === undefined) {
          self.emit(':ask', 'To get started, please tell me your timezone. You can say Pacific timezone...Mountain timezone...Central timezone...or Eastern timezone....What time zone are you in?');
          return;
        }

      trackEvent(
        'Intent',
        'AMAZON.GetNumberOfTotalVisitsIntent',
        userID,
        'Get Total Visits',
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
                    if (total > 0) {
                      var retrievedDate = new Date(data.Items[total-1].dateAtGym+(1000*60*60*self.attributes['timeZone']));
                      console.log("Query succeeded. Total: "+total+" your last visit was "+ formatDate(retrievedDate));
                      if (total>1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ formatDate(retrievedDate);
                      } else if (total===1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ formatDate(retrievedDate) +' ... Seriously? I can\'t believe you asked me!';
                      }
                    } else {
                      console.log("It's less than zero!!");
                      responseBuild = 'There has been an error - Are you sure you have been to the gym?..... ever?';
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

      if (checkForTimeZone(self)) { return; }

      trackEvent(
        'Intent',
        'AMAZON.GetNumberOfVisitsSinceDateIntent',
        userID,
        'Get Visits Since Date',
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

                      if (total>0) {
                      var retrievedDate = formatDate(new Date(data.Items[total-1].dateAtGym + (1000*60*60*self.attributes['timeZone'])));

                      console.log("Query succeeded. Total: "+total+" your last visit was "+retrievedDate);
                      if (total>1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ retrievedDate;
                      };
                      if (total===1){
                        responseBuild = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ retrievedDate+' ... Seriously? I can\'t believe you asked me!';
                      };
                    } else {
                        responseBuild = 'Hmmm... Are you trying to trick me, it doesn\'t look like you have been to the gym, yet!';
                    }
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

      if (checkForTimeZone(self)) { return; }

      trackEvent(
        'Intent',
        'AMAZON.ResetGymCount',
        userID,
        'Reset Gym Counter',
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
      var userID = this.event['session']['user']['userId'];

      trackEvent(
        'Intent',
        'AMAZON.HelpIntent',
        userID,
        'HELP',
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

    "AMAZON.CancelIntent": function () {
        var self = this;
        var userID = this.event['session']['user']['userId'];
        var cancelIntentPhrase = "Okay...Good bye.";
        trackEvent(
          'Intent',
          'AMAZON.CancelIntent',
          userID,
          'STOP',
          '100', // Event value must be numeric.
          function(err) {
            if (err) {
                return next(err);
            }
          self.emit(':tell', cancelIntentPhrase);
          });
    },

    "AMAZON.StopIntent": function () {
        var self = this;
        var userID = this.event['session']['user']['userId'];
        var cancelIntentPhrase = "Okay...Good bye";
        trackEvent(
          'Intent',
          'AMAZON.StopIntent',
          userID,
          'STOP',
          '100', // Event value must be numeric.
          function(err) {
            if (err) {
                return next(err);
            }
          self.emit(':tell', cancelIntentPhrase);
          });
    },

    'Unhandled': function () {
        var self = this;
        var userID = this.event['session']['user']['userId'];
        var unhandledPhrase = "Are you are having trouble? You can ask how many times you have been to the gym, or say reset gym tracker to reset all data... If you are going to the gym, just say, I\'m off to the gym!";
        trackEvent(
          'Intent',
          'AMAZON.unhandled',
          userID,
          'PROBLEM - UNHANDLED',
          '100',
          function(err) {
            if (err) {
                return next(err);
            }
            self.emit(':ask', unhandledPhrase, repromptText);
          });
    }




 };

 function checkForTimeZone(self){
   if ((self.attributes['timeZone']) === undefined) {
     self.emit(':ask', 'To get started, please tell me your timezone. You can say Pacific timezone...Mountain timezone...Central timezone...or Eastern timezone....What time zone are you in?');
     return true;
   }
 }


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

function insertNewDate(params, userID, self) {
  var gymDate = new Date();
  var lastDate = "";
  var currentDate = formatDate(gymDate);
  var responseDuplicate = 'Hmm.... It looks like you already told me you went to the gym. Say help for additional commands';
  var responseOK = 'Keep up the great work! I made a note of this.';


 dynamo.query(params, function(err, data) {
     if (err) {
         console.error("Unable to query. Error:", JSON.stringify(err, null, 2));

     } else {
       var total = data.Items.length;
       if (total>0) {
         console.log("total Records: "+ total);
         lastDate = formatDate(new Date(data.Items[total-1].dateAtGym));
         console.log("Last date: "+lastDate + " Today's Date: "+ currentDate);
         if (lastDate === currentDate) { //check to see if they tried to input the same day twice!
           self.emit(':ask', responseDuplicate, repromptText);
         } else {
           console.log("response is yes");
           dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: gymDate.getTime()}},
           function(err, data) {
             if (err)
                 console.log(err, err.stack); // an error occurred
             else
                 self.emit(':tell', responseOK);
             });
         }
       } else {
         console.log("response is yes");
         dynamo.putItem({ TableName : tableName, Item : {stampId : gymDate.getTime(), userId : userID, dateAtGym: gymDate.getTime()}},
         function(err, data) {
           if (err)
               console.log(err, err.stack); // an error occurred
           else
               self.emit(':tell', responseOK);
           });
       }
     }
 });
 }
