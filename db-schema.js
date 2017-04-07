var sql = require("seriate");
var getMeasureByCod = function (measureCod, language) {
    return sql.execute({
        query: sql.fromFile("./sql/getMeasureByCod"),
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
    });
};
var getMultiplierByCod = function (measureCod) {
    return sql.execute({
        query: sql.fromFile("./sql/getMultiplierByCod"),
        params: {
            measureCod: {
                type: sql.INT,
                val: parseInt(measureCod)
            }
        }
    });
};

var getStateByCod = function (stateCod, language) {
    return sql.execute({
        query: sql.fromFile("./sql/getStateByCod"),
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
    });
};

module.exports = {
    getMeasureByCod: getMeasureByCod,
    getMultiplierByCod: getMultiplierByCod,
    getStateByCod: getStateByCod
};