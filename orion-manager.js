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

var doBrowse = true;

var addressSpaceCrawler = require('./address-space-crawler.js');
var subscribeBroker = require('./subscribe-broker.js');

var OrionManager = (function () {

    var contexts = null;
    //Costructor
    var OrionManager = function () {
        reset();
    }

    var init = function () {
        contexts = [];
    }
    var reset = function () {
        contexts = null;
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
                console.log('There was an error activating the Agent: ' + err.message);
                process.exit(1);
            } else {
                console.log("NotificationHandler attached to ContextBroker");
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
                console.log("No addresspace retrieved from server retrieve".bold.red);
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
            } if (opcuaType === "Variable") {
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
        contexts.forEach(function (context) {
            console.log('registering OCB context ' + context.id);
            var device = {
                id: context.id,
                type: context.type,
                service: config.service,
                subservice: config.subservice,
                active: context.active, //only active used in this VERSION
                lazy: context.lazy,
                commands: context.commands
            };
            try {
                iotAgentLib.register(device, function (err) {
                    if (err) { // skip context
                        console.log("could not register OCB context " + context.id + "".red.bold);
                        console.log(JSON.stringify(err).red.bold);
                    } else { // init subscriptions
                        console.log("registered successfully OCB context " + context.id);
                        context.mappings.forEach(function (mapping) {
                            subscribeBroker.manageSubscriptionBroker(context, mapping);
                        });
                    }
                    counter++;
                });
            } catch (err) {
                console.log("error registering OCB context".red.bold);
                console.log(JSON.stringify(err).red.bold);
                callback(err);
                return;
            }
            if (counter === contexts.length)
                callback();
        });
    }


    var createOrionSubscriptions = function (callback) {
        if (doBrowse) {
            var counter = 0;
            var attributeTriggers = [];
            var contextSubscriptions = contexts || config.contextSubscriptions;
            contextSubscriptions.forEach(function (cText) {
                cText.mappings.forEach(function (map) {
                    attributeTriggers.push(map.ocb_id);
                });
            });
            contextSubscriptions.forEach(function (context) {
                counter++;
                console.log('subscribing OCB context ' + context.id + " for attributes: ");
                attributeTriggers.forEach(function (attr) {
                    console.log("attribute name: " + attr + "".cyan.bold);
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
                        attributeTriggers, function (err) {
                            if (err) {
                                console.log('There was an error subscribing device [%s] to attributes [%j]'.bold.red,
                                    device.name, attributeTriggers);
                                // callback();
                            } else {
                                console.log('Successfully subscribed device [%s] to attributes[%j]'.bold.yellow,
                                    device.name, attributeTriggers);
                                // callback();
                            }

                        });
                } catch (err) {
                    console.log('There was an error subscribing device [%s] to attributes [%j]',
                        device.name, attributeTriggers);
                    console.log(JSON.stringify(err).red.bold);
                    callback();
                    return;
                }
                if (counter === contextSubscriptions.length)
                    callback();
            });

        } else {
            callback();
        }
    }
    OrionManager.prototype = {
        //constructor
        constructor: OrionManager,
        activate: activate,
        registerContexts: registerContexts,
        createOrionSubscriptions: createOrionSubscriptions,
        createContextAttributesForOCB: createContextAttributesForOCB,
        getContexts: getContexts,
        setContexts: setContexts,
        reset: reset,
        init: init
    }
    return OrionManager;
})();
module.exports = new OrionManager();
