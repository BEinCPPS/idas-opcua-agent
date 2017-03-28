"use strict";
const config = require('./config');
const objectPath = require("object-path");
var async = require("async");
const logger = require("./logger.js");
var addressSpaceCrawler = require('./address-space-crawler');
var orionManager = require('./orion-manager');
var subscribeBroker = require('./subscribe-broker');

var AddressSpaceUpdater = (function () {
    var nodeObj = null;

    var AddressSpaceUpdater = function () {}

    var reset = function () {
        nodeObj = null;
    }

    var updateAll = function () {
        logger.debug("Entering in UPDATE ALL...".cyan.bold);
        async.series([
            function (callback) {
                addressSpaceCrawler.crawlServer(the_session, null, callback);
            },
            function (callback) {
                orionManager.createContextAttributesForOCB(null, callback);
            },
            //------------------------------------------
            // initialize all subscriptions
            function (callback) {
                orionManager.registerContexts(callback);
            },
            // function (callback) {
            //     orionManager.createOrionSubscriptions(callback);
            // }
        ], function (err) {
            if (err) {
                logger.error(" Error in update address space from Server", err);
                logger.error(" stack trace", err.stack);
            } else {
                logger.info("Refresh successful".cyan.bold);
            }
        })
    }

    var detectChangeInAddressSpace = function (node) {
        if (addressSpaceCrawler.getServerObject().hasComponent) {
            var retrieveData = null;
            if (!node.parentNodeId) {
                retrieveData = objectPath.get(obj, node.name); //returns "d" 
            } else {
                retrieveData = objectPath.get(obj, node.parentName + "." + node.name);
            }
            console.log("Data retrieved " + retrieveData);
            if (retrieveData) return; //Possiedo gia' l'elemento
        }
        nodeObj = node;
        addNode();
    }

    var addNode = function () {
        async.series([
            // function (callback) {
            //     addressSpaceCrawler.crawlServer(the_session, nodeObj, callback);
            // },
            function (callback) {
                orionManager.createContextAttributesForOCB(nodeObj, callback);
            },
            function (callback) {
                if (typeof nodeObj.parentNodeId === "undefined" || nodeObj == null) //nodo padre
                    orionManager.registerContexts(callback);
                else //createContextAttributesForOCB
                    subscribeBroker.manageSubscriptionBroker(orionManager.getContexts()[0],
                        orionManager.getContexts()[0].mappings[0]);
            },
            function (callback) {
                orionManager.createOrionSubscriptions(callback);
            }
        ], function (err) {
            // this is called whenever a step call callback() passing along an err object
            if (err) {
                console.log(" error", err);
                console.log(" stack trace", err.stack);
            } else {
                console.log("success adding node");
            }
        })
    }

    AddressSpaceUpdater.prototype = {
        updateAll: updateAll,
        constructor: AddressSpaceUpdater,
        reset: reset
    }
    return AddressSpaceUpdater;
})();
module.exports = new AddressSpaceUpdater();