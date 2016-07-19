// node-opcue dependencies
require("requirish")._(module);
var treeify = require('treeify');
var _ = require("underscore");
var util = require("util");
var crawler = require('./node_modules/node-opcua/lib/client/node_crawler.js');
var async = require("async");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;

// iotagent-node-lib dependencies
var iotAgentLib = require('iotagent-node-lib');

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

    .alias('e', 'endpoint')
    .alias('s', 'securityMode')
    .alias('P', 'securityPolicy')
    .alias("u", 'userName')
    .alias("p", 'password')
    .alias("t", 'timeout')

    .alias("d", "debug")
    .alias("b", "browse")
    .example("simple_client  --endpoint opc.tcp://localhost:49230 -P=Basic256 -s=SIGN")
    .example("simple_client  -e opc.tcp://localhost:49230 -P=Basic256 -s=SIGN -u JoeDoe -p P@338@rd ")
    .example("simple_client  --endpoint opc.tcp://localhost:49230  -n=\"ns=0;i=2258\"")

    .argv;

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

var timeout = parseInt(argv.timeout) * 1000 || 20000; //default 

var doBrowse = argv.browse ? true : false;

console.log("endpointUrl         = ".cyan, endpointUrl);
console.log("securityMode        = ".cyan, securityMode.toString());
console.log("securityPolicy      = ".cyan, securityPolicy.toString());
console.log("timeout             = ".cyan, timeout ? timeout : " Infinity ");


// set to false to disable address space crawling: might slow things down if the AS is huge
var doCrawling = argv.crawl ? true : false;

var client = null;
var the_session = null;
var the_subscriptions = [];
var contexts = [];
var methods = [];


function removeSuffixFromName(name, suffix) {
    if (name.indexOf(suffix) > -1) {
        var str = name.replace(suffix, "");
        return str;
    }
    return name;
}

function terminateAllSubscriptions() {
    if (the_subscriptions) {
        the_subscriptions.forEach(function (subscription) {
            console.log("terminating subscription: ", subscription.subscriptionId);
            subscription.terminate();
        });
    }
}

function disconnect() {
    console.log(" closing session");
    the_session.close(function (err) {
        console.log(" session closed", err);
    });

    console.log(" Calling disconnect");
    client.disconnect(function (err) {
        console.log(" disconnected", err);
    });
}

function initSubscriptionBroker(context, mapping) {
    // TODO this stuff too should come from config
    var parameters = {
        requestedPublishingInterval: 100,
        requestedLifetimeCount: 1000,
        requestedMaxKeepAliveCount: 12,
        maxNotificationsPerPublish: 10,
        publishingEnabled: true,
        priority: 10
    };
    var subscription = new opcua.ClientSubscription(the_session, parameters);

    function getTick() {
        return Date.now();
    }

    var t = getTick();

    subscription.on("started", function () {

        console.log("started subscription: ",
            subscription.subscriptionId);
        console.log(" revised parameters ");
        console.log("  revised maxKeepAliveCount  ",
            subscription.maxKeepAliveCount, " ( requested ",
            parameters.requestedMaxKeepAliveCount + ")");
        console.log("  revised lifetimeCount      ",
            subscription.lifetimeCount, " ( requested ",
            parameters.requestedLifetimeCount + ")");
        console.log("  revised publishingInterval ",
            subscription.publishingInterval, " ( requested ",
            parameters.requestedPublishingInterval + ")");
        console.log("  suggested timeout hint     ",
            subscription.publish_engine.timeoutHint);

    }).on("internal_error", function (err) {

        console.log("received internal error".red.bold);
        console.log(JSON.stringify(err).red.bold);

    }).on("keepalive", function () {

        var t1 = getTick();
        var span = t1 - t;
        t = t1;
        console.log("keepalive ", span / 1000, "sec", " pending request on server = ",
            subscription.publish_engine.nbPendingPublishRequests);

    }).on("terminated", function (err) {

        if (err) {
            console.log("could not terminate subscription: " + subscription.subscriptionId + "".red.bold);
            console.log(JSON.stringify(err).red.bold);
        } else {
            console.log("successfully terminated subscription: " + subscription.subscriptionId);
        }

    });

    the_subscriptions.push(subscription);

    console.log("initializing monitoring: " + mapping.opcua_id);

    var monitoredItem = subscription.monitor(
        {
            nodeId: mapping.opcua_id,
            attributeId: opcua.AttributeIds.Value
        },
        // TODO some of this stuff (samplingInterval for sure) should come from config
        {
            clientHandle: 13, // TODO need to understand the meaning this! we probably cannot reuse the same handle everywhere
            samplingInterval: 250,
            queueSize: 10000,
            discardOldest: true
        }
    );

    monitoredItem.on("initialized", function () {
        console.log("started monitoring: " + monitoredItem.itemToMonitor.nodeId.toString());
    });

    monitoredItem.on("changed", function (dataValue) {
        var variableValue = null;
        if (dataValue.value && dataValue.value != null)
            variableValue = dataValue.value.value || null;
        console.log(monitoredItem.itemToMonitor.nodeId.toString(), " value has changed to " + variableValue + "".bold.yellow);
        iotAgentLib.getDevice(context.id, function (err, device) {
            if (err) {
                console.log("could not find the OCB context " + context.id + "".red.bold);
                console.log(JSON.stringify(err).red.bold);
            } else {
                function findType(name) {
                    // TODO we only search the 'active' namespace: does it make sense? probably yes
                    for (var i = 0; i < device.active.length; i++) {
                        if (device.active[i].name === name) {
                            return device.active[i].type;
                        }
                    }
                    return null;
                }

                /* WARNING attributes must be an ARRAY */
                var attributes = [{
                    name: mapping.ocb_id,
                    type: mapping.type || findType(mapping.ocb_id),
                    value: variableValue
                }];
                /*WARNING attributes must be an ARRAY*/
                iotAgentLib.update(device.name, device.type, '', attributes, device, function (err) {
                    if (err) {
                        console.log("error updating " + mapping.ocb_id + " on " + device.name + "".red.bold);
                        console.log(JSON.stringify(err).red.bold);
                    } else {
                        console.log("successfully updated " + mapping.ocb_id + " on " + device.name);
                    }
                });
            }
        });
    });

    monitoredItem.on("err", function (err_message) {
        console.log(monitoredItem.itemToMonitor.nodeId.toString(), " ERROR".red, err_message);
    });
}

/*
  @author ascatox 
  Method call on OPCUA Server  
 */
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

/*
  @author ascatox 
  Handler for incoming notifications.
 
  @param {Object} device           Object containing all the device information.
  @param {Array} updates           List of all the updated attributes.

 */
function notificationHandler(device, updates, callback) {
    console.log("Data coming from OCB: ".bold.cyan, JSON.stringify(updates));
    callMethods(updates[0].value); //TODO gestire multiple chiamate
}
// each of the following steps is executed in due order
// each step MUST call callback() when done in order for the step sequence to proceed further
async.series([
    //------------------------------------------
    // initialize client connection to the OCB
    function (callback) {
        iotAgentLib.activate(config, function (err) {
            if (err) {
                console.log('There was an error activating the Agent: ' + err.message);
                process.exit(1);
            } else {
                console.log("NotificationHandler attached to ContextBroker");
                iotAgentLib.setNotificationHandler(notificationHandler);

            }
            callback();
        });
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
                console.log(" session created".yellow);
                console.log(" sessionId : ", session.sessionId.toString());
            }
            callback(err);
        });
    },

    /*
       @author ascatox 
        Use "-browse option"
        Browse the OPCUA Server Address Space ObjectsFolder to find the Devices and the Variables to listen.
        Configuration is present in config file "browseServerOptions" section.
        Creation of contexts to listen and methods to invoke inside the server. 
      
     */
    function (callback) {
        if (doBrowse) {
            the_session.browse(config.browseServerOptions.mainFolderToBrowse, function (err, browse_result) {
                if (!err) {
                    var configObj = config.browseServerOptions.mainObjectStructure;
                    browse_result.forEach(function (result) {
                        result.references.forEach(function (reference) {
                            var name = reference.browseName.toString();
                            if (name.indexOf(configObj.namePrefix) > -1) {
                                var contextObj = {
                                    id: name,
                                    type: config.defaultType,
                                    mappings: [],
                                    active: [], //only active USED in this version
                                    lazy: [],
                                    commands: []
                                };
                                the_session.browse(reference.nodeId, function (err, browse_result_sub) {
                                    browse_result_sub.forEach(function (resultSub) {
                                        resultSub.references.forEach(function (referenceChild) {
                                            var nameChild = referenceChild.browseName.toString();
                                            if (nameChild.indexOf(configObj.variableType1.nameSuffix) > -1
                                                ||
                                                nameChild.indexOf(configObj.variableType2.nameSuffix) > -1) {
                                                var type = nameChild.indexOf(configObj.variableType1.nameSuffix) > -1
                                                    ? configObj.variableType1.type : configObj.variableType2.type;
                                                var contextMeasureObj = {
                                                    ocb_id: nameChild,
                                                    opcua_id: referenceChild.nodeId.toString(),
                                                    type: type
                                                };
                                                var attributeObj = {
                                                    name: nameChild,
                                                    type: type
                                                }
                                                contextObj.mappings.push(contextMeasureObj);
                                                contextObj.active.push(attributeObj);
                                            } else if (nameChild.indexOf(configObj.methodNameSuffix) > -1) {
                                                var method = {
                                                    objectId: reference.nodeId,
                                                    methodId: referenceChild.nodeId.toString(),
                                                    name: nameChild
                                                };
                                                methods.push(method);
                                            }
                                        });
                                    });
                                });
                                contexts.push(contextObj);
                            }
                        });
                    });
                }
                callback(err);
            });
        } else {
            contexts = config.contexts;
            callback();
        }
    },

    // ----------------------------------------
    // display namespace array
    function (callback) {
        var server_NamespaceArray_Id = opcua.makeNodeId(opcua.VariableIds.Server_NamespaceArray); // ns=0;i=2006
        the_session.readVariableValue(server_NamespaceArray_Id, function (err, dataValue, diagnosticsInfo) {

            console.log(" --- NAMESPACE ARRAY ---");
            if (!err) {
                var namespaceArray = dataValue.value.value;
                for (var i = 0; i < namespaceArray.length; i++) {
                    console.log(" Namespace ", i, "  : ", namespaceArray[i]);
                }
            }
            console.log(" -----------------------");
            callback(err);
        });
    },

    //------------------------------------------
    // crawl the address space, display as a hierarchical tree rooted in ObjectsFolder
    function (callback) {
        if (doCrawling) {
            var nodeCrawler = new crawler.NodeCrawler(the_session);

            var t = Date.now();
            var t1;
            client.on("send_request", function () {
                t1 = Date.now();
            });
            client.on("receive_response", function () {
                var t2 = Date.now();
                var str = util.format("R= %d W= %d T=%d t= %d", client.bytesRead, client.bytesWritten, client.transactionsPerformed, (t2 - t1));
                console.log(str.yellow.bold);
            });

            t = Date.now();
            var nodeId = "ObjectsFolder";
            console.log("now crawling object folder ...please wait...");
            nodeCrawler.read(nodeId, function (err, obj) {
                if (!err) {
                    treeify.asLines(obj, true, true, function (line) {
                        console.log(line);
                    });
                }
                callback(err);
            });
        } else {
            callback();
        }
    },

    //------------------------------------------
    // initialize all subscriptions
    function (callback) {
        contexts.forEach(function (context) {
            console.log('registering OCB context ' + context.id);
            var device = {
                id: context.id,
                type: context.type,
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
                            initSubscriptionBroker(context, mapping);
                        });
                    }
                });
            } catch (err) {
                console.log("error registering OCB context".red.bold);
                console.log(JSON.stringify(err).red.bold);
                callback();
                return;
            }
        });
        callback();
    },
    /*
           @author ascatox 
           I'm trying to implement communication from OCB to IOT Agent
           by subscriptions to default Context
    */
    function (callback) {
        var attributeTriggers = [];
        config.contextSubscriptions.forEach(function (cText) {
            cText.mappings.forEach(function (map) {
                attributeTriggers.push(map.ocb_id);
            });
        });

        config.contextSubscriptions.forEach(function (context) {
            console.log('subscribing OCB context ' + context.id + " for attributes: ");
            attributeTriggers.forEach(function (attr) {
                console.log("attribute name: " + attr + "".cyan.bold);
            });
            var device = {
                id: context.id,
                name: context.id,
                type: context.type,
                service: config.service,
                subservice: config.subservice
            };
            try {
                iotAgentLib.subscribe(device, attributeTriggers,
                    attributeTriggers, function (err) {
                        if (err) {
                            console.log('There was an error subscribing device [%s] to attributes [%j]'.bold.red,
                                device.name, attributeTriggers);
                        } else {
                            console.log('Successfully subscribed device [%s] to attributes[%j]'.bold.yellow,
                                device.name, attributeTriggers);
                        }
                        callback();
                    });
            } catch (err) {
                console.log('There was an error subscribing device [%s] to attributes [%j]',
                    device.name, attributeTriggers);
                console.log(JSON.stringify(err).red.bold);
                callback();
                return;
            }
        });
    },

    //------------------------------------------
    // set up a timer that shuts down the client after a given time
    function (callback) {
        console.log("Starting timer ", timeout);
        var timerId;
        if (timeout > 0) {
            timerId = setTimeout(function () {
                terminateAllSubscriptions();
                // TODO don't know if this approach may be broken (see commented code below)
                // but let's assume it won't matter anyway as we are shutting down...
                callback();
                //the_subscription.once("terminated", function() {
                //    callback();
                //});
                //the_subscription.terminate();
            }, timeout);
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
    terminateAllSubscriptions();
    disconnect();
});

