// node-opcue dependencies
require("requirish")._(module);
var _ = require("underscore");
var util = require("util");
var async = require("async");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
// iotagent-node-lib dependencies
var iotAgentLib = require('iotagent-node-lib');
var logger = require("./logger.js");
// configuration of iotagent-node-lib
var config = require('./config');

var argv = require('yargs')
    .wrap(132)
    //.usage('Usage: $0 -d --endpoint <endpointUrl> [--securityMode (NONE|SIGNANDENCRYPT|SIGN)] [--securityPolicy (None|Basic256|Basic128Rsa15)] ')

    .demand("endpoint")
    .string("endpoint")
    .describe("endpoint", "the end point to connect to ")

    .string("securityMode")
    .describe("securityMode", "the security mode")

    .string("securityPolicy")
    .describe("securityPolicy", "the policy mode")

    .string("userName")
    .describe("userName", "specify the user name of a UserNameIdentityToken ")

    .string("password")
    .describe("password", "specify the password of a UserNameIdentityToken")

    .string("timeout")
    .describe("timeout", " the timeout of the session in second =>  (-1 for infinity)")

    .string("debug")
    .describe("debug", " display more verbose information")

    .string("browse")
    .describe("browse", " browse Objects from opc-ua server. Fulfill browseServerOptions section in config file")

    .string("port")
    .describe("port", " server port override configuration server.port")

    .alias('e', 'endpoint')
    .alias('S', 'securityMode')
    .alias('P', 'securityPolicy')
    .alias("u", 'userName')
    .alias("p", 'password')
    .alias("t", 'timeout')

    .alias("d", "debug")
    .alias("b", "browse")
    .alias("s", "port")
    .example("simple_client  --endpoint opc.tcp://localhost:49230 -P=Basic256 -s=SIGN")
    .example("simple_client  -e opc.tcp://localhost:49230 -P=Basic256 -s=SIGN -u JoeDoe -p P@338@rd ")
    .example("simple_client  --endpoint opc.tcp://localhost:49230  -n=\"ns=0;i=2258\"")
    .argv;

config.server.port = Number(argv.port) || config.server.port;


var endpointUrl = argv.endpoint;
if (!endpointUrl) {
    require('yargs').showHelp();
    return;
}

var securityMode = opcua.MessageSecurityMode.get(argv.securityMode || "NONE");
if (!securityMode) {
    throw new Error("Invalid Security mode , should be " + opcua.MessageSecurityMode.enums.join(" "));
}

var securityPolicy = opcua.SecurityPolicy.get(argv.securityPolicy || "None");
if (!securityPolicy) {
    throw new Error("Invalid securityPolicy , should be " + opcua.SecurityPolicy.enums.join(" "));
}
var timeout = parseInt(argv.timeout) * 1000 || -1; //604800*1000; //default 20000

//var doBrowse = true; //TODO
//argv.browse ? true : false;

console.log("endpointUrl         = ".cyan, endpointUrl);
console.log("securityMode        = ".cyan, securityMode.toString());
console.log("securityPolicy      = ".cyan, securityPolicy.toString());
console.log("timeout             = ".cyan, timeout ? timeout : " Infinity ");

var client = null;
var the_session = null;
//var methods = [];

var addressSpaceCrawler = require('./address-space-crawler.js'); 
addressSpaceCrawler.init();
var orionManager = require('./orion-manager.js'); 
orionManager.init();
var subscribeBroker = require('./subscribe-broker.js'); 
subscribeBroker.init();
var addressSpaceListener = require('./address-space-listener.js');


function disconnect() {
    console.log(" closing session");
    the_session.close(function (err) {
        logger.error(" session closed "+err);
    });

    console.log(" Calling disconnect");
    client.disconnect(function (err) {
        logger.error(" disconnected "+err);
    });
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
(function main() {
    async.series([
        //------------------------------------------
        // initialize client connection to the OCB
        function (callback) {
            orionManager.activate(callback);
        },

        //------------------------------------------
        // initialize client connection to the OPCUA Server
        function (callback) {
            var options = {
                securityMode: securityMode,
                securityPolicy: securityPolicy,
                defaultSecureTokenLifetime: 40000
            };
            console.log("Options = ", options.securityMode.toString(), options.securityPolicy.toString());

            client = new opcua.OPCUAClient(options);

            console.log(" connecting to ", endpointUrl.cyan.bold);
            client.connect(endpointUrl, callback);

            client.on("connection_reestablished", function () {
                console.log(" !!!!!!!!!!!!!!!!!!!!!!!!  CONNECTION RESTABLISHED !!!!!!!!!!!!!!!!!!!");

            });
        },

        //------------------------------------------
        // initialize client session on the OPCUA Server
        function (callback) {
            var userIdentity = null; // anonymous
            if (argv.userName && argv.password) {

                userIdentity = {
                    userName: argv.userName,
                    password: argv.password
                };

            }
            client.createSession(userIdentity, function (err, session) {
                if (!err) {
                    the_session = session;
                    logger.info(" session created".yellow);
                    logger.info(" sessionId : ", session.sessionId.toString());
                    subscribeBroker.setSession(the_session);
                    subscribeBroker.manageSubscriptionForEventNotifier();
                }
                callback(err);
            });
        },

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

        function (callback) {
            orionManager.createOrionSubscriptions(callback);
        },

        //------------------------------------------
        // set up a timer that shuts down the client after a given time
        function (callback) {
            console.log("Starting timer ", timeout);
            var timerId;
            if (timeout > 0) {
                timerId = setTimeout(function () {
                    subscribeBroker.terminateAllSubscriptions();
                    // TODO don't know if this approach may be broken (see commented code below)
                    // but let's assume it won't matter anyway as we are shutting down...
                    callback();
                    //the_subscription.once("terminated", function() {
                    //    callback();
                    //});a
                    //the_subscription.terminate();
                }, timeout);
            } else if (timeout == -1) {
                //  Infinite activity
                console.log("NO Timeout set!!!".bold.cyan);
                //setTimeout(browseAndSubscribe, 10000);

            } else {
                callback();
            }
        },

        //------------------------------------------
        // when the timer goes off, we first close the session...
        function (callback) {
            console.log(" closing session");
            the_session.close(function (err) {
                console.log(" session closed", err);
                callback();
            });
        },

        // ...and finally the the connection
        function (callback) {
            console.log(" Calling disconnect");
            client.disconnect(callback);
        }

    ], function (err) {
        // this is called whenever a step call callback() passing along an err object
        console.log(" disconnected".cyan);

        if (err) {
            console.log(" client : process terminated with an error".red.bold);
            console.log(" error", err);
            console.log(" stack trace", err.stack);
        } else {
            console.log("success !!   ");
        }
        // force disconnection
        if (client) {
            client.disconnect(function () {
                var exit = require("exit");
                console.log("Exiting");
                exit();
            });
        }

    });

    // not much use for this...
    process.on("error", function (err) {
        console.log(" UNTRAPPED ERROR", err.message);
    });

    // handle CTRL+C
    var user_interruption_count = 0;
    process.on('SIGINT', function () {

        console.log(" user interruption ...");

        user_interruption_count += 1;
        if (user_interruption_count >= 3) {
            process.exit(1);
        }

        console.log(" Received client interruption from user ".red.bold);
        console.log(" shutting down ...".red.bold);
        subscribeBroker.terminateAllSubscriptions();
        disconnect();
    });
})();

