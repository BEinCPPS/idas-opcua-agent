"use strict";
// node-opcue dependencies
var util = require("util");
var _ = require("underscore");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
var iotAgentLib = require('iotagent-node-lib');
var config = require('./config');
var logger = require("./logger.js");

var doBrowse = true;

var OrionManager = (function () {
    var addressSpaceCrawler = null;
    var subscribeBroker = null;
    var contexts = null;
    var savedMappingsMap = null;
    var measuresSubscribed = null;
    //Costructor
    var OrionManager = function () {}

    var init = function (addressSpaceCrawler_, subscribeBroker_) {
        contexts = [];
        addressSpaceCrawler = addressSpaceCrawler_;
        subscribeBroker = subscribeBroker_;
        savedMappingsMap = new HashMap();
        measuresSubscribed = new HashMap();
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
            if (typeof attributes === "undefined" ||
                attributes == null ||
                attributes.length === 0) return;
            for (var j in attributes) {
                var attribute = attributes[j];
                if (attribute) {
                    var type = attribute.browseName.indexOf("measure") >= 0 ? "integer" : "string"; //TODO;
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
                name: config.defaultType + ':' + context.id,
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
                        logger.debug("could not register OCB mappings for " + context.id + " " + JSON.stringify(context.active) + "".red.bold);
                        if (err.name === "DUPLICATE_DEVICE_ID" && context.id.indexOf("Event") === -1) { // and active contains measures
                            var mappingsOld = savedMappingsMap.get(context.id);
                            logger.debug("Mappings before: for context " + context.id + "  " + JSON.stringify(mappingsOld));
                            logger.debug("Mappings current: for context  " + context.id + "  " + JSON.stringify(context.mappings));
                            var differences = _.difference(_.pluck(context.mappings, "ocb_id"), _.pluck(mappingsOld, "ocb_id"));
                            var results = _.filter(context.mappings, function (obj) {
                                return differences.indexOf(obj.ocb_id) >= 0;
                            });
                            logger.debug("Differences encounterd in mappings: " + JSON.stringify(differences));
                            logger.debug("Differences result encounterd: " + JSON.stringify(results));
                            for (var i in results) {
                                if (!measuresSubscribed.has(results[i].ocb_id)) {
                                    measuresSubscribed.set(results[i].ocb_id, results[i]);
                                    subscribeBroker.manageSubscriptionBroker(context, results[i]);
                                }
                            }
                            savedMappingsMap.set(context.id, _.clone(context.mappings));
                        }
                    } else { // init subscriptions
                        logger.info("registered successfully OCB context " + context.id);
                        savedMappingsMap.set(context.id, context.mappings);
                        context.mappings.forEach(function (mapping) {
                            logger.debug("Attempt to opcua subscribe for attribute: " + mapping.ocb_id + " with context " + context.id);
                            subscribeBroker.manageSubscriptionBroker(context, mapping);
                        });
                        if (context.id.indexOf("Event") === -1) //TODO
                            createOrionSubscription(context, device);
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

    OrionManager.prototype = {
        //constructor
        constructor: OrionManager,
        activate: activate,
        registerContexts: registerContexts,
        createContextAttributesForOCB: createContextAttributesForOCB,
        getContexts: getContexts,
        setContexts: setContexts,
        reset: reset,
        init: init
    }
    return OrionManager;
})();
module.exports = new OrionManager();