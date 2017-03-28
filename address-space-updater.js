"use strict";
const config = require('./config');
const objectPath = require("object-path");
var async = require("async");
const logger = require("./logger.js");

var AddressSpaceUpdater = (function () {
    var nodeObj = null;
    var addressSpaceCrawler = null;
    var orionManager = null;

    var AddressSpaceUpdater = function () {}

    var reset = function () {
        nodeObj = null;
        addressSpaceCrawler = null;
        orionManager = null;
    }

    var init = function (addressSpaceCrawler_, orionManager_) {
        addressSpaceCrawler = addressSpaceCrawler_;
        orionManager = orionManager_;
    }

    var updateAll = function (session) {
        logger.info("Entering in UPDATE ALL...".cyan.bold);
        async.series([
            function (callback) {
                addressSpaceCrawler.crawlServer(session, null, callback);
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
    AddressSpaceUpdater.prototype = {
        updateAll: updateAll,
        constructor: AddressSpaceUpdater,
        init: init,
        reset: reset
    }
    return AddressSpaceUpdater;
})();
module.exports = new AddressSpaceUpdater();