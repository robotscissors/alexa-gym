"use strict";
console.log ("gym tracker started");
var APP_ID = "amzn1.ask.skill.5091e1a5-fb91-45aa-bf14-5b6dc4dc29a7";
var Alexa = require('alexa-sdk');
var tableName = "GymTracker3";
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

            var gymDate = new Date();
            console.log('You are at the gym: '+ formatDate(gymDate));
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
      //do something amazing error capture?
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
                    console.log("Query succeeded. Total: "+total+" your last visit was "+data.Items[total-1].dateAtGym);
                    if (total>1){
                      response = 'You have been to the gym a total of '+ data.Items.length + 'times. The last time was '+ data.Items[total-1].dateAtGym;
                    };
                    if (total===1){
                      response = 'You have been to the gym a total of '+ data.Items.length + 'time. "+The last time was '+ data.Items[total-1].dateAtGym+' ... Seriously? I can\'t believe you asked me!';
                    };

                    self.emit(':tell', response);
                    // data.Items.forEach(function(item) {
                    //     console.log(" -", item.stampId + ": " + item.userId);
                    // });
                }
            });


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
        this.emit(':ask', 'you can say things like how many times have you been to the gym this month, or say reset gym tracker to reset all data');
    },

    'Unhandled': function () {
        this.emit(':ask', 'Are You are having trouble? You can ask how many times you have been to the gym, or say reset gym tracker to reset all data. If you are going to the gym, just say, I\'m off to the gym!');
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
