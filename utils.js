'use strict'
var config = require('./config')
var Utils = {
  removeParenthesisfromAttr: function (attributeValue) {
    if (attributeValue) {
      return attributeValue.replace(/[{()}]/g, '')
    }
  },
  removeSuffixFromName: function (name, suffix) {
    if (name.indexOf(suffix) > -1) {
      var str = name.replace(suffix, '')
      return str
    }
    return name
  },
  isEventNotifier: function (elementName) {
    if (elementName === config.browseServerOptions.eventNotifier) {
      return true
    }
    return false
  },
  isEmptyForValue: function (value) {
    if (typeof value === 'undefined' ||
      value == null || value.lenght === 0 || value === 'null' || value === 'NULL') {
      return true
    }
    return false
  },
  isStateParam: function (value) {
    var namePrefix1 = config.browseServerOptions.mainObjectStructure.variableType1.namePrefix
    var namePrefix2 = config.browseServerOptions.mainObjectStructure.variableType2.namePrefix
    if (value.indexOf(namePrefix1) < 0 && value.indexOf(namePrefix2) < 0) {
      return null
    }
    if (value.indexOf(namePrefix1) > -1) { // ex measure13
      return false
    } else if (value === namePrefix2) { // state value
      return true
    } else {
      return false
    }
  }
}
module.exports = Utils
