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
var HashMap = require("hashmap");
var sql = require("seriate");

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

var doBrowse = true; //TODO
//argv.browse ? true : false;

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

var dbSchema = require("./db-schema");
const languageDb = config.databaseConnection.languageDb;
var cacheDb = new HashMap();

// Change the config settings to match your 
// SQL Server and database
var configDb = {
    "host": config.databaseConnection.host,
    "user": config.databaseConnection.user,
    "password": config.databaseConnection.password,
    "database": config.databaseConnection.database
};
sql.setDefault(configDb);
console.log("SQL Server connection initialized!!!!".bold.cyan);

function removeParenthesisfromAttr(attributeValue) {
    if (attributeValue)
        return attributeValue.replace(/[{()}]/g, '');
}

function getMeasureInfoFromDb(measureCod) {
    return dbSchema.getMeasureByCod(measureCod, languageDb);
}

function getStateInfoFromDb(stateCod) {
    return dbSchema.getStateByCod(stateCod, languageDb);
}

function getAttributeInfoFromDb(attributeCod, attributeValue) {
    var namePrefix1 = config.browseServerOptions.mainObjectStructure.variableType1.namePrefix;
    var namePrefix2 = config.browseServerOptions.mainObjectStructure.variableType2.namePrefix;
    if (attributeCod.indexOf(namePrefix1) < 0 && attributeCod.indexOf(namePrefix2) < 0) {
        return null;
    }
    if (attributeCod.indexOf(namePrefix1) > -1) { // ex measure13
        var attrCode = attributeCod.replace(namePrefix1, '');
        return getMeasureInfoFromDb(attrCode);
    } else if (attributeCod.indexOf(namePrefix2) > -1) { //state value
        return getStateInfoFromDb(attributeValue);
    }
}

function createContextAttributesForOCB(the_session, reference, contextObj, callback, error) {
    if (!reference) return;
    var nameVariable = reference.browseName.toString();
    var contextVariableObj = null;
    var attributeObj = null;
    var structure = config.browseServerOptions.mainObjectStructure;
    if (nameVariable.indexOf(structure.variableType1.namePrefix) > -1
        || nameVariable.indexOf(structure.variableType3.namePrefix) > -1) { //MEASURE || ACK

        var type = nameVariable.indexOf(structure.variableType1.namePrefix) > -1
            ? structure.variableType1.type : structure.variableType3.type;

        contextVariableObj = {
            ocb_id: nameVariable,
            opcua_id: reference.nodeId.toString(),
            type: type

        };
        attributeObj = {
            name: nameVariable,
            type: type
        }
        contextObj.mappings.push(contextVariableObj);
        contextObj.active.push(attributeObj);
    } else if (nameVariable.indexOf(structure.variableType2.namePrefix) > -1 //STATE || INFO
        || nameVariable.indexOf(structure.variableType4.namePrefix) > -1) {

        var structure = nameVariable.indexOf(structure.variableType2.namePrefix) > -1
            ? structure.variableType2 : structure.variableType4;
        the_session.browse(reference.nodeId, function (err, browse_result_sub) {
            if (!browse_result_sub) callback(error);
            browse_result_sub.forEach(function (resultSub) {
                if (!resultSub) callback(error);
                resultSub.references.forEach(function (referenceChild) {
                    var nameProperty = referenceChild.browseName.toString();
                    if (structure.properties.length > 0) { //TODO ERROR
                        structure.properties.forEach(function (prop) {
                            if (prop.name === nameProperty) {
                                contextVariableObj = {
                                    ocb_id: prop.name,
                                    opcua_id: referenceChild.nodeId.toString(),
                                    type: prop.type,
                                };
                                attributeObj = {
                                    name: prop.name,
                                    type: prop.type
                                }
                                contexts = [];
                                contextObj.mappings.push(contextVariableObj);
                                contextObj.active.push(attributeObj);
                                contexts.push(contextObj);
                                callback(error);
                            }
                        });
                    } else
                        callback(error);
                });
            });
        });
        contextVariableObj = {
            ocb_id: nameVariable,
            opcua_id: reference.nodeId.toString(),
            type: structure.type,
        };
        attributeObj = {
            name: nameVariable,
            type: structure.type
        }
        contextObj.mappings.push(contextVariableObj);
        contextObj.active.push(attributeObj);
    }
}

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
        // TODO All these attributes are optional remove ?
        {
            //clientHandle: 13, // TODO need to understand the meaning this! we probably cannot reuse the same handle everywhere
            samplingInterval: 250,
            queueSize: 10000,
            discardOldest: true
        },
        opcua.read_service.TimestampsToReturn.Both
    );

    monitoredItem.on("initialized", function () {
        console.log("started monitoring: " + monitoredItem.itemToMonitor.nodeId.toString());
    });

    monitoredItem.on("changed", function (dataValue) {
        function updateMonitored() {
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
                        value: variableValue,
                        metadatas: [
                            {
                                name: "sourceTimestamp",
                                type: "typestamp",
                                value: dataValue.sourceTimestamp
                            },
                            {
                                name: "serverTimestamp",
                                type: "typestamp",
                                value: new Date()
                            },
                            {
                                name: "description",
                                type: "string",
                                value: attributeInfoObj != null ? removeParenthesisfromAttr(attributeInfoObj.Descr) : null  //TODO from database
                            }
                        ]
                    }];
                    if (mapping.ocb_id.indexOf(config.browseServerOptions.mainObjectStructure.variableType1.namePrefix) > -1) {
                        var measCode = {
                            name: "measCode",
                            type: "string",
                            value: mapping.ocb_id.replace(config.browseServerOptions.mainObjectStructure.variableType1.namePrefix, '')
                        }
                        attributes[0].metadatas.add(measCode);
                        if (attributeInfoObj && attributeInfoObj.MeasUnit) {
                            var measUnit = {
                                name: "measUnit",
                                type: "string",
                                value: removeParenthesisfromAttr(attributeInfoObj.MeasUnit)
                            }
                            attributes[0].metadatas.add(measUnit);
                        }
                    }
                    console.log("ATTRIBUTES", attributes);
                    console.log("METADATAS", attributes[0].metadatas);
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
        }
        var variableValue = null;
        if (typeof dataValue.value !== "undefined" && dataValue.value != null) //TODO typeof dataValue.value !== 'undefined'
            variableValue = dataValue.value.value; //QUI
            //|| null;
        var attributeInfoObj = null;
        if (doBrowse) {
            if (cacheDb.has(mapping.ocb_id)) {
                attributeInfoObj = cacheDb.get(mapping.ocb_id);
                updateMonitored();
            }
            else {
                var fn = getAttributeInfoFromDb(mapping.ocb_id, variableValue);
                if (fn == null) updateMonitored();
                else fn.then(function (results) {
                    console.log(results);
                    attributeInfoObj = results[0]; //I have always one result!!
                    cacheDb.set(mapping.ocb_id, results[0]);
                    updateMonitored();
                }, function (err) {
                    console.log("SQL Error happended:".bold.red, err);
                    updateMonitored();
                });
            }
        } else
            updateMonitored();
    });

    monitoredItem.on("err", function (err_message) {
        console.log(monitoredItem.itemToMonitor.nodeId.toString(), " ERROR".red, err_message);
    });
}

/*
  @author ascatox 
  Method call on OPCUA Server 
  Not used in this version of Software 
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
                                            //var nameChild = referenceChild.browseName.toString();
                                            createContextAttributesForOCB(the_session, referenceChild, contextObj, callback, err);
                                        });
                                    });
                                });
                            }
                        });
                    });
                }
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
                            initSubscriptionBroker(context, mapping);
                        });
                    }
                    callback();
                });
            } catch (err) {
                console.log("error registering OCB context".red.bold);
                console.log(JSON.stringify(err).red.bold);
                callback(err);
                return;
            }
        });
    },
    /*
           @author ascatox
           Use "-browse option" 
           I'm trying to implement communication from OCB to IOT Agent
           by subscriptions to default Context
    */
    function (callback) {
        if (doBrowse) {
            var attributeTriggers = [];
            var contextSubscriptions = contexts || config.contextSubscriptions;
            contextSubscriptions.forEach(function (cText) {
                cText.mappings.forEach(function (map) {
                    attributeTriggers.push(map.ocb_id);
                });
            });

            contextSubscriptions.forEach(function (context) {
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
                                callback();
                            } else {
                                console.log('Successfully subscribed device [%s] to attributes[%j]'.bold.yellow,
                                    device.name, attributeTriggers);
                                callback();
                            }

                        });
                } catch (err) {
                    console.log('There was an error subscribing device [%s] to attributes [%j]',
                        device.name, attributeTriggers);
                    console.log(JSON.stringify(err).red.bold);
                    callback();
                    return;
                }
            });
        } else {
            callback();
        }
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
        } else if (timeout == -1) {
            //  Infinite activity
            console.log("NO Timeout set!!!".bold.cyan);

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

