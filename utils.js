
'use strict'
var config = require('./config')
var Utils = {
  removeParenthesisfromAttr: function (attributeValue) {
    if (attributeValue) { return attributeValue.replace(/[{()}]/g, '') }
  },
  removeSuffixFromName: function (name, suffix) {
    if (name.indexOf(suffix) > -1) {
      var str = name.replace(suffix, '')
      return str
    }
    return name
  },
  isEventNotifier: function (elementName) {
    if (elementName === config.browseServerOptions.eventNotifier) { return true }
    return false
  }
}
module.exports = Utils
