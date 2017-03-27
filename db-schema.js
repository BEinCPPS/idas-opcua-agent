var sql = require("seriate");
var getMeasureByCod = function (mesaureCod, language) {
    return sql.execute({
        query: sql.fromFile("./sql/getMeasureByCod"),
        params: {
            measureCod: {
                type: sql.INT,
                val: parseInt(mesaureCod)
            },
            language: {
                type: sql.INT,
                val: language
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
    getStateByCod: getStateByCod
};