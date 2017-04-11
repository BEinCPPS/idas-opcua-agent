'use strict'
// node-opcue dependencies
require('requirish')._(module)
var _ = require('underscore')
var crawler = require('./node_modules/node-opcua/lib/client/node_crawler.js')
var logger = require('./logger')
var doCrawling = true

var AddressSpaceCrawler = (function () {
  var serverObject = null
  var serverObjectPrevious = null
    // Costructor
  var AddressSpaceCrawler = function () {}
  var getServerObject = function () {
    return serverObject
  }
  var getServerObjectPrevious = function () {
    return serverObjectPrevious
  }
  var init = function () {}

  var reset = function () {
    serverObject = null
    serverObjectPrevious = null
  }
  var crawlServer = function (session, node, callback) {
    var nodeCrawler = new crawler.NodeCrawler(session)
    var nodeId = typeof node === 'undefined' || node == null ? 'ns=1;s=main_folder' : node.nodeId
    nodeCrawler.read(nodeId, function (err, obj) {
      if (!err) {
        serverObjectPrevious = _.clone(serverObject)
        serverObject = obj
                // logger.debug("Differences in address Space", JSON.stringify(diff(getServerObjectPrevious, serverObject)));
        if (doCrawling) {
          logger.debug('Server Object:'.bold.cyan, JSON.stringify(obj))
        }
      } else { logger.error('Error in crawling server', JSON.stringify(err)) }
      callback(err)
    })
  }
  AddressSpaceCrawler.prototype = {
        // constructor
    constructor: AddressSpaceCrawler,
    crawlServer: crawlServer,
    getServerObject: getServerObject,
    getServerObjectPrevious: getServerObjectPrevious,
    reset: reset,
    init: init
  }
  return AddressSpaceCrawler
})()
module.exports = new AddressSpaceCrawler()
