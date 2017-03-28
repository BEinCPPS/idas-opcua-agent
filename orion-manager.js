"use strict";
// node-opcue dependencies
require("requirish")._(module);
var _ = require("underscore");
var util = require("util");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
var iotAgentLib = require('iotagent-node-lib');
var config = require('./config');
var logger = require("./logger.js");

var doBrowse = true;

//var addressSpaceCrawler = require('./address-space-crawler.js');
// var subscribeBroker = require('./subscribe-broker.js');

var OrionManager = (function () {
    var addressSpaceCrawler = null;
    var subscribeBroker = null;
    var contexts = null;
    //Costructor
    var OrionManager = function () {}

    var init = function (addressSpaceCrawler_, subscribeBroker_) {
        contexts = [];
        addressSpaceCrawler = addressSpaceCrawler_;
        subscribeBroker = subscribeBroker_;
    }
    var reset = function () {
        contexts = null;
        subscribeBroker = null;
        addressSpaceCrawler = null;
    }

    var getContexts = function () {
        return contexts;
    }
    var setContexts = function (contexts_) {
        contexts = contexts_;;
    }

    function notificationHandler(device, updates, callback) {
        console.log("Data coming from OCB: ".bold.cyan, JSON.stringify(updates));
        callMethods(updates[0].value); //TODO gestire multiple chiamate
    }

    var activate = function (callback) {
        iotAgentLib.activate(config, function (err) {
            if (err) {
                logger.error('There was an error activating the Agent: '.bold.red + err.message);
                process.exit(1);
            } else {
                logger.info("NotificationHandler attached to ContextBroker".cyan.bold);
                iotAgentLib.setNotificationHandler(notificationHandler);
            }
            callback(err);
        });
    }

    var createContextAttributesForOCB = function (node, callback) {
        function createContextAttributes(attributes) {
            if (typeof attributes === "undefined" || attributes == null || attributes.length === 0) return;
            for (var j in attributes) {
                var attribute = attributes[j];
                if (attribute) {
                    var type = attribute.browseName.indexOf("measure") > 0 ? "integer" : "string"; //TODO;
                    var contextVariableObj = {
                        ocb_id: attribute.browseName,
                        opcua_id: attribute.nodeId.toString(),
                        type: type

                    };
                    var attributeObj = {
                        name: attribute.browseName,
                        type: type
                    }
                    contextObj.mappings.push(contextVariableObj);
                    contextObj.active.push(attributeObj);
                    createContextAttributes(attribute.hasComponent);
                }
            }
        }
        if (doBrowse) {
            if (addressSpaceCrawler.getServerObject() == null) {
                logger.info("No addresspace retrieved from server retrieve".bold.red);
                callback("No addresspace retrieved from server retrieve");
            }
            var opcuaType = addressSpaceCrawler.getServerObject().typeDefinition;
            var testStations = null;
            if (opcuaType === "FolderType")
                testStations = addressSpaceCrawler.getServerObject().hasComponent; //TODO Only testStations
            //Non toccare serverObject ma usare il node meglio non sporcare!!!
            else if (opcuaType === "Object")
                testStations = addressSpaceCrawler.getServerObject();
            if (testStations != null) {
                for (var i in testStations) {
                    var testStation = testStations[i];
                    //if (testStation.browseName.indexOf("Event") > -1) continue;
                    var contextObj = {
                        id: testStation.browseName,
                        type: config.defaultType,
                        mappings: [],
                        active: [], //only active USED in this version
                        lazy: [],
                        commands: []
                    };
                    if (typeof testStation.hasComponent !== "undefined" && testStation.hasComponent != null) {
                        createContextAttributes(testStation.hasComponent);
                    }
                    contexts.push(contextObj);
                }
            }
            if (opcuaType === "Variable") {
                var contextObj = {
                    id: node.parentBrowseName,
                    type: config.defaultType,
                    mappings: [],
                    active: [], //only active USED in this version
                    lazy: [],
                    commands: []
                };
                createContextAttributes(addressSpaceCrawler.getServerObject());
                contexts.push(contextObj);
            }
            callback();
        } else callback();
    }

    var registerContexts = function (callback) {
        var counter = 0;
        if (contexts == null || contexts.length === 0) {
            logger.info("No contexts found!!!".cyan.bold);
            callback();
        }
        contexts.forEach(function (context) {
            logger.info('registering OCB context ' + context.id);
            var device = {
                id: context.id,
                type: context.type,
                service: config.service,
                subservice: config.subservice,
                active: context.active, //only active used in this VERSION
                lazy: context.lazy,
                commands: context.commands,
                endpoint: config.providerUrl
            };
            try {
                iotAgentLib.register(device, function (err) {
                    if (err) { // skip context
                        logger.error("could not register OCB context " + context.id + "".red.bold, JSON.stringify(err));
                        logger.debug("devo capire se è stata aggiunta o meno una misura se si la devo sottoscrivere!!!!");
                    } else { // init subscriptions
                        logger.info("registered successfully OCB context " + context.id);
                        context.mappings.forEach(function (mapping) {
                            subscribeBroker.manageSubscriptionBroker(context, mapping);
                            if (context.id.indexOf("Event") > -1)
                                createOrionSubscription(context, device);
                        });
                    }
                    counter++;
                });
            } catch (err) {
                logger.error("error registering OCB context".red.bold, JSON.stringify(err));
                callback(err);
                return;
            }
            if (counter === contexts.length)
                callback();
        });
    }

    var createOrionSubscription = function (context, device) {
        if (typeof device === "undefined" ||
            typeof context === "undefined" ||
            device == null ||
            context == null) return;
        var attributeTriggers = [];
        context.mappings.forEach(function (map) {
            attributeTriggers.push(map.ocb_id);
        });
        try {
            iotAgentLib.subscribe(device, attributeTriggers, attributeTriggers,
                function (err) {
                    if (err) {
                        logger.error('There was an error subscribing device [%s] to attributes [%j]'.bold.red,
                            device.name, attributeTriggers);
                    } else {
                        logger.info('Successfully subscribed device [%s] to attributes[%j]'.bold.yellow,
                            device.name, attributeTriggers);
                    }
                });
        } catch (err) {
            logger.error('There was an error subscribing device [%s] to attributes [%j]',
                device.name, attributeTriggers);
            logger.error(JSON.stringify(err).red.bold);
        }
    }

    /*var createOrionSubscriptions = function (callback) {
        if (doBrowse) {
            var counter = 0;
            var attributeTriggers = [];
            var contextSubscriptions = contexts;
            //|| config.contextSubscriptions;
            if (contexts == null || contexts.length === 0) callback();
            contextSubscriptions.forEach(function (cText) {
                cText.mappings.forEach(function (map) {
                    attributeTriggers.push(map.ocb_id);
                });
            });
            contextSubscriptions.forEach(function (context) {
                counter++;
                logger.info('subscribing OCB context ' + context.id + " for attributes: ");
                attributeTriggers.forEach(function (attr) {
                    logger.info("attribute name: " + attr + "".cyan.bold);
                });

                var device = {
                    id: context.id,
                    name: config.defaultType + ':' + context.id,
                    //name: context.id,
                    type: context.type,
                    service: config.service,
                    subservice: config.subservice,
                    endpoint: config.providerUrl //URL to send notifications
                };
                try {
                    iotAgentLib.subscribe(device, attributeTriggers,
                        attributeTriggers,
                        function (err) {
                            if (err) {
                                logger.error('There was an error subscribing device [%s] to attributes [%j]'.bold.red,
                                    device.name, attributeTriggers);
                                // callback();
                            } else {
                                logger.info('Successfully subscribed device [%s] to attributes[%j]'.bold.yellow,
                                    device.name, attributeTriggers);
                                // callback();
                            }
                        });
                } catch (err) {
                    logger.error('There was an error subscribing device [%s] to attributes [%j]',
                        device.name, attributeTriggers);
                    logger.error(JSON.stringify(err).red.bold);
                    callback();
                    return;
                }
                if (counter === contextSubscriptions.length)
                    callback();
            });

        } else {
            callback();
        }
    }*/

    OrionManager.prototype = {
        //constructor
        constructor: OrionManager,
        activate: activate,
        registerContexts: registerContexts,
        //createOrionSubscriptions: createOrionSubscriptions,
        createContextAttributesForOCB: createContextAttributesForOCB,
        getContexts: getContexts,
        setContexts: setContexts,
        reset: reset,
        init: init
    }
    return OrionManager;
})();
module.exports = new OrionManager();