"use strict";
var HashMap = require("hashmap");
var iotAgentLib = require('iotagent-node-lib');
var config = require('./config');
const utilsLocal = require('./utils.js');
var orionManager = require('./orion-manager');
var logger = require("./logger.js");


var OrionUpdater = (function () {
    //Costructor
    var OrionUpdater = function () {}
    var updateMonitored = function (context, mapping, dataValue, variableValue, attributeInfo) {
        logger.debug("Context " + context.id + " attribute " + mapping.ocb_id, " value has changed to " + variableValue + "".bold.yellow);
        iotAgentLib.getDevice(context.id, function (err, device) {
            if (err) {
                logger.error("could not find the OCB context " + context.id + "".red.bold);
                logger.error(JSON.stringify(err).red.bold);
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
                    value: typeof variableValue === "undefined" || variableValue == null ? null : variableValue,
                    metadatas: [{
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
                            value: attributeInfo != null ?
                                utilsLocal.removeParenthesisfromAttr(attributeInfo.Descr) : null //TODO from database
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
                    if (attributeInfo && attributeInfo.MeasUnit) {
                        var measUnit = {
                            name: "measUnit",
                            type: "string",
                            value: utilsLocal.removeParenthesisfromAttr(attributeInfo.MeasUnit)
                        }
                        attributes[0].metadatas.add(measUnit);
                    }
                }
                logger.debug("ATTRIBUTES".bold.cyan, JSON.stringify(attributes));
                logger.debug("METADATAS".bold.cyan, JSON.stringify(attributes[0].metadatas));
                /*WARNING attributes must be an ARRAY*/
                iotAgentLib.update(device.name, device.type, '', attributes, device, function (err) {
                    if (err) {
                        logger.error("Error updating " + mapping.ocb_id + " on " + device.name + "".red.bold);
                        logger.error(JSON.stringify(err).red.bold);
                    } else {
                        logger.debug("Successfully updated ".bold.cyan + "" + mapping.ocb_id + "".bold.red + " on " + device.name + "".bold.red);
                    }
                });
            }
        });
    }
    OrionUpdater.prototype = {
        //constructor
        constructor: OrionUpdater,
        updateMonitored: updateMonitored
    }
    return OrionUpdater;
})();
module.exports = new OrionUpdater();