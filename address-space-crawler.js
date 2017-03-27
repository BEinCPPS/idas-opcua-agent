"use strict";
// node-opcue dependencies
require("requirish")._(module);
var treeify = require('treeify');
var _ = require("underscore");
var util = require("util");
var crawler = require('./node_modules/node-opcua/lib/client/node_crawler.js');
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
var iotAgentLib = require('iotagent-node-lib');
var config = require('./config');
var logger = require("./logger");
var doCrawling = false;

var AddressSpaceCrawler = (function () {
    var serverObject = null;
    var serverObjectPrevious = null;
    var serverHash = null;
    //Costructor
    var AddressSpaceCrawler = function () {}
    var getServerObject = function () {
        return serverObject;
    }

    var init = function () {}

    var reset = function () {
        serverObject = null;
        serverObjectPrevious = null;
    }
    var crawlServer = function (the_session, node, callback) {
        serverObjectPrevious = JSON.parse(JSON.stringify(serverObject));
        var nodeCrawler = new crawler.NodeCrawler(the_session);
        var nodeId = typeof node === "undefined" || node == null ? "ns=1;s=main_folder" : node.nodeId;
        nodeCrawler.read(nodeId, function (err, obj) {
            if (!err) {
                //serverObjectPrevious = JSON.parse(JSON.stringify(serverObject));
                serverObject = obj;
                if (doCrawling) {
                    treeify.asLines(obj, true, true, function (line) {
                        logger.info(line);
                    });
                }
            } else
                logger.error("Error in crawling server", JSON.stringify(err));
            callback(err);
        });
    }
    AddressSpaceCrawler.prototype = {
        //constructor
        constructor: AddressSpaceCrawler,
        crawlServer: crawlServer,
        getServerObject: getServerObject,
        getServerObjectPrevious: getServerObjectPrevious,
        reset: reset,
        init: init
    }
    return AddressSpaceCrawler;
})();
module.exports = new AddressSpaceCrawler();