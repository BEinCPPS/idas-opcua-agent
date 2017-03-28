"use strict";
// node-opcue dependencies
require("requirish")._(module);
var _ = require("underscore");
var util = require("util");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
var config = require('./config');

var orionUpdater = require('./orion-updater.js');
var doBrowse = true; //TODO
var dbManager = require('./db-manager.js');
dbManager.init();
var logger = require("./logger.js");
//var addressSpaceUpdater = require('./address-space-updater.js');



var SubscribeBroker = (function () {
    var the_subscriptions = null;
    var cacheDb = new HashMap();
    var parameters = null;
    var the_session = null;
    var subscription = null;
    var hash = null;
    var addressSpaceUpdater = null;
    //var orionUpdater = null; //TODO pass as paramter

    //Costructor
    var SubscribeBroker = function () {}

    var getSession = function () {
        return the_session;
    }

    var setSession = function (session) {
        the_session = session;
    }
    var init = function (addressSpaceUpdater_) {
        the_subscriptions = [];
        parameters = {
            requestedPublishingInterval: 100,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 12,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        };
        addressSpaceUpdater = addressSpaceUpdater_;
        //orionUpdater = orionUpdater_;
    }
    var reset = function () {
        the_subscriptions = null;
        cacheDb = new HashMap();
        subscription = null;
        hash = null;
        addressSpaceUpdater = null;
        //orionUpdater = null;
    }
    var getSubscriptions = function () {
        return the_subscriptions;
    }
    var subscribeEventNotifier = function () {

    }
    var initSubscription = function () {
        subscription = new opcua.ClientSubscription(the_session, parameters);
        if (subscription == null) initSubscription();

        function getTick() {
            return Date.now();
        }
        var t = getTick();
        subscription.on("started", function () {
            console.log("started subscription: ",
                subscription.subscriptionId);
            console.log(" revised parameters ");
            console.log("  revised maxKeepAliveCount  ",
                subscription.maxKeepAliveCount, " ( requested ",
                parameters.requestedMaxKeepAliveCount + ")");
            console.log("  revised lifetimeCount      ",
                subscription.lifetimeCount, " ( requested ",
                parameters.requestedLifetimeCount + ")");
            console.log("  revised publishingInterval ",
                subscription.publishingInterval, " ( requested ",
                parameters.requestedPublishingInterval + ")");
            console.log("  suggested timeout hint     ",
                subscription.publish_engine.timeoutHint);

        }).on("internal_error", function (err) {
            logger.error("received internal error".red.bold, err);

        }).on("keepalive", function () {

            var t1 = getTick();
            var span = t1 - t;
            t = t1;
            console.log("keepalive ", span / 1000, "sec", " pending request on server = ",
                subscription.publish_engine.nbPendingPublishRequests);

        }).on("terminated", function (err) {
            if (err) {
                logger.error("could not terminate subscription: " + subscription.subscriptionId + "".red.bold);
                logger.error("Error encountered in terminate subscription".red.bold, JSON.stringify(err));
            } else {
                logger.info("successfully terminated subscription: " + subscription.subscriptionId);
            }
        });

        the_subscriptions.push(subscription);
    }

    var manageSubscriptionBroker = function (context, mapping) {
        if (subscription == null) initSubscription();
        logger.info("initializing monitoring: " + mapping.opcua_id);
        var monitoredItem = subscription.monitor({
                nodeId: mapping.opcua_id,
                attributeId: opcua.AttributeIds.Value
            }, {
                //clientHandle: 13, // TODO need to understand the meaning this! we probably cannot reuse the same handle everywhere
                samplingInterval: 250,
                queueSize: 10000,
                discardOldest: true
            },
            opcua.read_service.TimestampsToReturn.Both
        );

        monitoredItem.on("initialized", function () {
            logger.info("started monitoring: " + monitoredItem.itemToMonitor.nodeId.toString());
        });

        monitoredItem.on("changed", function (dataValue) {
            function updateChangeForContext() {
                var variableValue = null;
                if (typeof dataValue.value !== "undefined" && dataValue.value != null) //TODO typeof dataValue.value !== 'undefined'
                    variableValue = dataValue.value.value;
                //|| null;
                var attributeInfoObj = null;
                if (doBrowse) {
                    if (cacheDb.has(mapping.ocb_id)) {
                        attributeInfoObj = cacheDb.get(mapping.ocb_id);
                        orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, attributeInfoObj);
                    } else {
                        var fn = dbManager.getAttributeInfoFromDb(mapping.ocb_id, variableValue);
                        if (fn == null) orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, attributeInfoObj);
                        else fn.then(function (results) {
                            console.log(results);
                            attributeInfoObj = results[0]; //I have always one result!!
                            cacheDb.set(mapping.ocb_id, results[0]);
                            orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, attributeInfoObj);
                        }, function (err) {
                            logger.error("SQL Error happended:".bold.red, err);
                            orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, attributeInfoObj);
                        });
                    }
                } else
                    orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, attributeInfoObj);
            }
            if (typeof dataValue.value !== "undefined" && dataValue.value != null) {
                if (context.id.indexOf("Event") === -1) {
                    updateChangeForContext();
                } else {
                    logger.info("Event notification arrived!!!".bold.cyan, dataValue.value);
                    if (hash !== dataValue.value.value) {
                        hash = dataValue.value.value;
                        addressSpaceUpdater.updateAll(the_session);
                    }
                }
            }
        });

        monitoredItem.on("err", function (err_message) {
            logger.error(monitoredItem.itemToMonitor.nodeId.toString() + " ERROR".red, err_message);
        });
    }

    var terminateAllSubscriptions = function () {
        if (the_subscriptions) {
            the_subscriptions.forEach(function (subscription) {
                logger.info("terminating subscription: ", subscription.subscriptionId);
                subscription.terminate();
            });
        }
    }

    SubscribeBroker.prototype = {
        //constructor
        constructor: SubscribeBroker,
        manageSubscriptionBroker: manageSubscriptionBroker,
        //manageSubscriptionForEventNotifier: manageSubscriptionForEventNotifier,
        terminateAllSubscriptions: terminateAllSubscriptions,
        setSession: setSession,
        getSession: getSession,
        reset: reset,
        init: init
    }
    return SubscribeBroker;
})();
module.exports = new SubscribeBroker();