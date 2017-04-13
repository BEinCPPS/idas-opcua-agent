'use strict'
// node-opcue dependencies
require('requirish')._(module)
var _ = require('underscore')
var opcua = require('node-opcua')
var HashMap = require('hashmap')

// var orionUpdater = require('./orion-updater.js');
var doBrowse = true // TODO

var logger = require('./logger.js')
var config = require('./config')

// var addressSpaceUpdater = require('./address-space-updater.js');

var SubscribeBroker = (function () {
  var subscriptions = null
  var cacheDb = new HashMap()
  var parameters = null
  var session = null
  var subscription = null
  var hash = null
  var variableValuePrevious = new HashMap()
  var addressSpaceUpdater = null
  var orionUpdater = null
  var productNumberManager = null
  var dbManager = null
  var monitoringConfig = null
  var orionManager = null
    // var orionUpdater = null; //TODO pass as paramter

    // Costructor
  var SubscribeBroker = function () {

  }

  var getSession = function () {
    return session
  }

  var setSession = function (session_) {
    session = session_
  }
  var init = function (addressSpaceUpdater_, orionUpdater_, productNumberManager_, dbManager_, orionManager_) {
    subscriptions = []
    parameters = {
      requestedPublishingInterval: 100,
      requestedLifetimeCount: 1000,
      requestedMaxKeepAliveCount: 12,
      maxNotificationsPerPublish: 10,
      publishingEnabled: true,
      priority: 10
    }
    addressSpaceUpdater = addressSpaceUpdater_
    orionUpdater = orionUpdater_
    productNumberManager = productNumberManager_
    dbManager = dbManager_
    orionManager = orionManager_
    monitoringConfig = {
            // clientHandle: 13, // TODO need to understand the meaning this! we probably cannot reuse the same handle everywhere
      samplingInterval: 1000, // 250
      queueSize: 1000, // 10000
      discardOldest: true
    }
        // orionUpdater = orionUpdater_;
  }
  var reset = function () {
    subscriptions = null
    cacheDb = new HashMap()
    subscription = null
    hash = null
    addressSpaceUpdater = null
    orionUpdater = null
    productNumberManager = null
    dbManager = null
    monitoringConfig = null
    orionManager = null
        // orionUpdater = null;
  }

  var initSubscription = function () {
    subscription = new opcua.ClientSubscription(session, parameters)
    if (subscription == null) initSubscription()

    function getTick () {
      return Date.now()
    }
    var t = getTick()
    subscription.on('started', function () {
      console.log('started subscription: ',
                subscription.subscriptionId)
      console.log(' revised parameters ')
      console.log('  revised maxKeepAliveCount  ',
                subscription.maxKeepAliveCount, ' ( requested ',
                parameters.requestedMaxKeepAliveCount + ')')
      console.log('  revised lifetimeCount      ',
                subscription.lifetimeCount, ' ( requested ',
                parameters.requestedLifetimeCount + ')')
      console.log('  revised publishingInterval ',
                subscription.publishingInterval, ' ( requested ',
                parameters.requestedPublishingInterval + ')')
      console.log('  suggested timeout hint     ',
                subscription.publish_engine.timeoutHint)
    }).on('internal_error', function (err) {
      logger.error('received internal error'.red.bold, err)
    }).on('keepalive', function () {
      var t1 = getTick()
      var span = t1 - t
      t = t1
      console.log('keepalive ', span / 1000, 'sec', ' pending request on server = ',
                subscription.publish_engine.nbPendingPublishRequests)
    }).on('terminated', function (err) {
      if (err) {
        logger.error('could not terminate subscription: ' + subscription.subscriptionId + ''.red.bold)
        logger.error('Error encountered in terminate subscription'.red.bold, JSON.stringify(err))
      } else {
        logger.info('successfully terminated subscription: ' + subscription.subscriptionId)
      }
    })
    subscriptions.push(subscription)
  }

  var manageSubscriptionBroker = function (context, mapping) {
    if (subscription == null) initSubscription()
    logger.info('initializing monitoring: ' + mapping.opcua_id + ':' + mapping.ocb_id)
    var monitoredItem = subscription.monitor({
      nodeId: mapping.opcua_id,
      attributeId: opcua.AttributeIds.Value
    }, monitoringConfig,
            opcua.read_service.TimestampsToReturn.Both
        )
    monitoredItem.on('initialized', function () {
      logger.info('started monitoring: ' + monitoredItem.itemToMonitor.nodeId.toString())
    })

    monitoredItem.on('changed', function (dataValue) {
      function updateSerialNumberAnd12NC (variableValue) {
        if (typeof variableValue === 'undefined' || variableValue == null) return
        if (mapping.ocb_id.indexOf('serialNumber') >= 0) {
          logger.debug('SerialNumber arrived with value: ' + variableValue)
          productNumberManager.setSerialNumber(variableValue)
        } else if (mapping.ocb_id.indexOf('12NC') >= 0) {
          logger.debug('12NC arrived with value: ' + variableValue)
          productNumberManager.set12NC(variableValue)
        }
      }
      function updateChangeForContext () {
        logger.debug('Received value change for '.bold.red + ' ' + context.id + ' for ', mapping)
        var variableValue = null
        if (typeof dataValue.value !== 'undefined' && dataValue.value != null) { // TODO typeof dataValue.value !== 'undefined'
          variableValue = dataValue.value.value
        }
        var mappingKey = context.id + '_' + mapping.ocb_id
        if ((variableValuePrevious.has(mappingKey) && variableValuePrevious.get(mappingKey) === variableValue) && config.discardEqualValues) {
          return
        }
        variableValuePrevious.set(mappingKey, variableValue)
        // logger.debug('ok->' + context.id + '_' + mapping.ocb_id, variableValue, 'result')
        var dbInfoObj = {}
        if (doBrowse) {
          updateSerialNumberAnd12NC(variableValue)
          if (cacheDb.has(mapping.ocb_id)) {
            dbInfoObj = cacheDb.get(mapping.ocb_id)
            orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, dbInfoObj)
          } else {
            var dbData = dbManager.getAttributeInfoFromDb(mapping.ocb_id, variableValue)
            if (dbData == null) orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, dbInfoObj)
            else {
              dbData.then(function (results) {
                logger.debug('Data fetched from DB', JSON.stringify(results))
                if (results.hasOwnProperty('measure') && results.hasOwnProperty('multiplier')) {
                  // I have always one result!!
                  dbInfoObj.Descr = results.measure[0].Descr
                  dbInfoObj.MeasUnit = results.measure[0].MeasUnit
                  dbInfoObj.Multiplier = results.multiplier[0].Multiplier
                } else { dbInfoObj = results[0] } // I have always one result!!
                cacheDb.set(mapping.ocb_id, dbInfoObj)
                orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, dbInfoObj)
              }, function (err) {
                logger.error('SQL Error happended:'.bold.red, err)
                orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, dbInfoObj)
              })
            }
          }
        } else { orionUpdater.updateMonitored(context, mapping, dataValue, variableValue, dbInfoObj) }
      }

      if (typeof dataValue.value !== 'undefined' && dataValue.value !== null) {
        if (context.id.indexOf('Event') === -1) { // NOT EVENT NOTIFIER
          updateChangeForContext()
        } else {
          logger.debug('Event notification arrived!!!'.bold.cyan, dataValue.value)
          if (hash !== dataValue.value.value) {
            hash = dataValue.value.value
            logger.info('START UPDATING Address Space'.bold.red, hash)
            addressSpaceUpdater.updateAll(session)
          }
        }
      }
    })

    monitoredItem.on('err', function (errMessage) {
      logger.error(monitoredItem.itemToMonitor.nodeId.toString() + ' ERROR'.red, errMessage)
    })
  }

  var terminateAllSubscriptions = function () {
    if (subscriptions) {
      subscriptions.forEach(function (subscription) {
        logger.info('terminating subscription: '.bold.red, subscription.subscriptionId)
        subscription.terminate()
      })
    }
  }

  SubscribeBroker.prototype = {
        // constructor
    constructor: SubscribeBroker,
    manageSubscriptionBroker: manageSubscriptionBroker,
        // manageSubscriptionForEventNotifier: manageSubscriptionForEventNotifier,
    terminateAllSubscriptions: terminateAllSubscriptions,
    setSession: setSession,
    getSession: getSession,
    reset: reset,
    init: init
  }
  return SubscribeBroker
})()
module.exports = new SubscribeBroker()
