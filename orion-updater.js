"use strict";
// node-opcue dependencies
require("requirish")._(module);
var _ = require("underscore");
var util = require("util");
var opcua = require("node-opcua");
var dataType = opcua.DataType;
var VariantArrayType = opcua.VariantArrayType;
var HashMap = require("hashmap");
var iotAgentLib = require('iotagent-node-lib');
var config = require('./config');
const utilsLocal = require('./utils.js');


var OrionUpdater = (function () {

    //Costructor
    var OrionUpdater = function () { }
    var updateMonitored = function (context, mapping, dataValue, variableValue, attributeInfo) {
        console.log("Context " + context.id + " attribute " + mapping.ocb_id, " value has changed to " + variableValue + "".bold.yellow);
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
                            value: attributeInfo != null ? utilsLocal.removeParenthesisfromAttr(attributeInfo.Descr) : null  //TODO from database
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
    OrionUpdater.prototype = {
        //constructor
        constructor: OrionUpdater,
        updateMonitored: updateMonitored
    }
    return OrionUpdater;
})();
module.exports = new OrionUpdater();
