
'use strict'
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
  }
}
module.exports = Utils
