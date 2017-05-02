// node-opcue dependencies
require('requirish')._(module)
var async = require('async')
var opcua = require('node-opcua')
var logger = require('./logger.js')
// configuration of iotagent-node-lib
var config = require('./config')

var argv = require('yargs')
    .wrap(132)
    // .usage('Usage: $0 -d --endpoint <endpointUrl> [--securityMode (NONE|SIGNANDENCRYPT|SIGN)] [--securityPolicy (None|Basic256|Basic128Rsa15)] ')

    .demand('endpoint')
    .string('endpoint')
    .describe('endpoint', 'the end point to connect to ')

    .string('securityMode')
    .describe('securityMode', 'the security mode')

    .string('securityPolicy')
    .describe('securityPolicy', 'the policy mode')

    .string('userName')
    .describe('userName', 'specify the user name of a UserNameIdentityToken ')

    .string('password')
    .describe('password', 'specify the password of a UserNameIdentityToken')

    .string('timeout')
    .describe('timeout', ' the timeout of the session in second =>  (-1 for infinity)')

    .string('debug')
    .describe('debug', ' display more verbose information')

    .string('browse')
    .describe('browse', ' browse Objects from opcua server. Fulfill browseServerOptions section in config file')

    .string('port')
    .describe('port', ' server port override configuration server.port')

    .alias('e', 'endpoint')
    .alias('S', 'securityMode')
    .alias('P', 'securityPolicy')
    .alias('u', 'userName')
    .alias('p', 'password')
    .alias('t', 'timeout')

    .alias('d', 'debug')
    .alias('b', 'browse')
    .alias('s', 'port')
    .example('simple_client  --endpoint opc.tcp://localhost:49230 -P=Basic256 -s=SIGN')
    .example('simple_client  -e opc.tcp://localhost:49230 -P=Basic256 -s=SIGN -u JoeDoe -p P@338@rd ')
    .example('simple_client  --endpoint opc.tcp://localhost:49230  -n="ns=0;i=2258"')
    .argv

config.server.port = Number(argv.port) || config.server.port

var endpointUrl = argv.endpoint
if (!endpointUrl) {
  require('yargs').showHelp()
    // return;
}

var securityMode = opcua.MessageSecurityMode.get(argv.securityMode || 'NONE')
if (!securityMode) {
  throw new Error('Invalid Security mode , should be ' + opcua.MessageSecurityMode.enums.join(' '))
}

var securityPolicy = opcua.SecurityPolicy.get(argv.securityPolicy || 'None')
if (!securityPolicy) {
  throw new Error('Invalid securityPolicy , should be ' + opcua.SecurityPolicy.enums.join(' '))
}
var timeout = parseInt(argv.timeout) * 1000 || -1 // 604800*1000; //default 20000

var doBrowse = typeof argv.browse !== 'undefined' || false

logger.info('endpointUrl         = '.cyan, endpointUrl)
logger.info('securityMode        = '.cyan, securityMode.toString())
logger.info('securityPolicy      = '.cyan, securityPolicy.toString())
logger.info('timeout             = '.cyan, timeout || ' Infinity ')

var client = null
var session = null
// var methods = [];

var addressSpaceCrawler = require('./address-space-crawler.js')
var orionManager = require('./orion-manager.js')
var subscribeBroker = require('./subscribe-broker.js')
var addressSpaceUpdater = require('./address-space-updater')
var orionUpdater = require('./orion-updater.js')
var productNumberManager = require('./product-number-manager')
var dbManager = require('./db-manager.js')

dbManager.init()
addressSpaceCrawler.init()
productNumberManager.init()
orionUpdater.init(productNumberManager)
subscribeBroker.init(addressSpaceUpdater, orionUpdater, productNumberManager, dbManager, orionManager, doBrowse)
orionManager.init(addressSpaceCrawler, subscribeBroker, doBrowse)
addressSpaceUpdater.init(addressSpaceCrawler, orionManager)

function disconnect () {
  console.log(' closing session')
  session.close(function (err) {
    logger.error(' session closed ' + err)
  })

  console.log(' Calling disconnect')
  client.disconnect(function (err) {
    logger.error(' disconnected ' + err)
  })
}

/*
  @author ascatox
  Method call on OPCUA Server
  Not used in this version of Software

function callMethods(value) {
    //TODO Metodi multipli
    if (!methods) return;
    try {
        methods[0].inputArguments = [{
            dataType: dataType.String,
            arrayType: VariantArrayType.Scalar,
            value: value
        }];
        the_session.call(methods, function (err, results) {
            if (!err)
                console.log("Method invoked correctly with result: ".bold.yellow, results[0].toString());
            else console.log("Error calling Method :".bold.red, err);
        });
    } catch (error) {
        console.log("Error calling Method :".bold.red, error);
    }
}
*/

/*
  @author ascatox
  Handler for incoming notifications.

  @param {Object} device           Object containing all the device information.
  @param {Array} updates           List of all the updated attributes.

 */

// each of the following steps is executed in due order
// each step MUST call callback() when done in order for the step sequence to proceed further
(function main () {
  async.series([
        // ------------------------------------------
        // initialize client connection to the OCB
    function (callback) {
      orionManager.activate(callback)
    },

        // ------------------------------------------
        // initialize client connection to the OPCUA Server
    function (callback) {
      var options = {
        securityMode: securityMode,
        securityPolicy: securityPolicy,
        defaultSecureTokenLifetime: 40000
      }
      console.log('Options = ', options.securityMode.toString(), options.securityPolicy.toString())

      client = new opcua.OPCUAClient(options)

      console.log(' connecting to ', endpointUrl.cyan.bold)
      client.connect(endpointUrl, callback)

      client.on('connection_reestablished', function () {
        logger.info(' !!!!!!!!!!!!!!!!!!!!!!!!  CONNECTION RESTABLISHED !!!!!!!!!!!!!!!!!!!'.cyan.bold)
      })
    },
        // ------------------------------------------
        // initialize client session on the OPCUA Server
    function (callback) {
      var userIdentity = null // anonymous
      if (argv.userName && argv.password) {
        userIdentity = {
          userName: argv.userName,
          password: argv.password
        }
      }
      client.createSession(userIdentity, function (err, session_) {
        if (!err) {
          session = session_
          logger.info(' session created'.yellow)
          logger.info(' sessionId : ', session.sessionId.toString())
          subscribeBroker.setSession(session)
          subscribeBroker.initSubscription()
        }
        callback(err)
      })
    },

    function (callback) {
      addressSpaceCrawler.crawlServer(session, null, callback)
    },

    function (callback) {
      orionManager.createContextAttributesForOCB(null, callback)
    },
        // ------------------------------------------
        // initialize all subscriptions
    function (callback) {
      orionManager.registerContexts(callback)
    },

        // function (callback) {
        //     orionManager.createOrionSubscriptions(callback);
        // },

        // ------------------------------------------
        // set up a timer that shuts down the client after a given time
    function (callback) {
      console.log('Starting timer ', timeout)
      var timerId
      if (timeout > 0) {
        timerId = setTimeout(function () {
          subscribeBroker.terminateAllSubscriptions()
                    // TODO don't know if this approach may be broken (see commented code below)
                    // but let's assume it won't matter anyway as we are shutting down...
          callback()
                    // the_subscription.once("terminated", function() {
                    //    callback();
                    // });a
                    // the_subscription.terminate();
        }, timeout)
      } else if (timeout == -1) {
                //  Infinite activity
        logger.info('NO Timeout set!!!'.bold.cyan)
        logger.info('Manage subscriptions to event notifier')
                // subscribeBroker.manageSubscriptionForEventNotifier();
      } else {
        callback()
      }
    },
        // ------------------------------------------
        // when the timer goes off, we first close the session...
    function (callback) {
      logger.info(' Closing session'.cyan.bold)
      session.close(function (err) {
        logger.error(' session closed', err)
        callback()
      })
    },

        // ...and finally the the connection
    function (callback) {
      logger.info(' Calling disconnect')
      client.disconnect(callback)
    }

  ], function (err) {
        // this is called whenever a step call callback() passing along an err object
    logger.info(' disconnected'.cyan)
    // orionManager.unsuscribeOrionSubscriptions() //TODO
    dbManager.closeConnection()
    if (err) {
      logger.error(' client : process terminated with an error'.red.bold)
      logger.error(' error', err)
      logger.error(' stack trace', err.stack)
    } else {
      logger.info('success !!   ')
    }
        // force disconnection
    if (client) {
      client.disconnect(function () {
        var exit = require('exit')
        console.log('Exiting')
        exit()
      })
    }
  })

    // not much use for this...
  process.on('error', function (err) {
    logger.error(' UNTRAPPED ERROR', err.message)
  })

    // handle CTRL+C
  var userInterruptionCount = 0
  process.on('SIGINT', function () {
    console.log(' user interruption ...')
    // orionManager.unsuscribeOrionSubscriptions() //TODO
    dbManager.closeConnection()
    userInterruptionCount += 1
    if (userInterruptionCount >= 3) {
      process.exit(1)
    }

    logger.info(' Received client interruption from user '.red.bold)
    logger.info(' shutting down ...'.red.bold)
    subscribeBroker.terminateAllSubscriptions()
    disconnect()
  })
})()
