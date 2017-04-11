var sql = require('seriate')
var getMeasureByCod = function (measureCod, language) {
  return sql.execute({
    query: sql.fromFile('./sql/getMeasureByCod'),
    params: {
      measureCod: {
        type: sql.INT,
        val: parseInt(measureCod)
      },
      language: {
        type: sql.INT,
        val: language
      }
    }
  })
}
var getMultiplierByCod = function (measureCod) {
  return sql.execute({
    query: sql.fromFile('./sql/getMultiplierByCod'),
    params: {
      measureCod: {
        type: sql.INT,
        val: parseInt(measureCod)
      }
    }
  })
}

var getAllMeasureInfoByCod = function (measureCod, language) {
  return sql.getPlainContext()
// Step 1 get Measure Info Description and Measure Unit
.step('measure', {query: sql.fromFile('./sql/getMeasureByCod'),
  params: {
    measureCod: {
      type: sql.INT,
      val: parseInt(measureCod)
    },
    language: {
      type: sql.INT,
      val: language
    }
  }
})
// Setp 2 - Get the Multiplier from another table
.step('multiplier', function (execute, data) {
  execute({
    query: sql.fromFile('./sql/getMultiplierByCod'),
    params: {
      measureCod: {
        type: sql.INT,
        val: parseInt(measureCod)
      }
    }
  })
})
}

var getStateByCod = function (stateCod, language) {
  return sql.execute({
    query: sql.fromFile('./sql/getStateByCod'),
    params: {
      stateCod: {
        type: sql.INT,
        val: parseInt(stateCod)
      },
      language: {
        type: sql.INT,
        val: language
      }
    }
  })
}

module.exports = {
  getMeasureByCod: getMeasureByCod,
  getMultiplierByCod: getMultiplierByCod,
  getStateByCod: getStateByCod,
  getAllMeasureInfoByCod: getAllMeasureInfoByCod
}
