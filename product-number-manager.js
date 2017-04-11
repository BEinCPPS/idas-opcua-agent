'use strict'
var logger = require('./logger.js')
var _ = require('underscore')

var ProductNumberManager = (function () {
  var serialNumber = null
  var serialNumberPrevious = null
  var _12NC = null

    // Costructor
  var ProductNumberManager = function () {
    reset()
  }

  var init = function () {
  }

  var reset = function () {
    serialNumber = null
    _12NC = null
  }

  var setSerialNumber = function (serialNumber_) {
    serialNumberPrevious = _.clone(serialNumber)
    serialNumber = serialNumber_
    callD2LAbService()
  }
  var set12NC = function (_12NC_) {
    _12NC = _12NC_
  }

  var getSerialNumber = function () {
    return serialNumber
  }
  var get12NC = function () {
    return _12NC
  }
  // TODO Call the D2LAbService
  var callD2LAbService = function () {
    if (serialNumber.trim() !== serialNumberPrevious.trim()) {
      // Call service
      logger.info('SerialNumber Changed!!! Calling the D2Lab Service ')
    }
  }

  ProductNumberManager.prototype = {
        // constructor
    constructor: ProductNumberManager,
    reset: reset,
    init: init,
    setSerialNumber: setSerialNumber,
    set12NC: set12NC,
    get12NC: get12NC,
    getSerialNumber: getSerialNumber
  }
  return ProductNumberManager
})()
module.exports = new ProductNumberManager()
