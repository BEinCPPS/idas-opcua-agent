var mssql = require('mssql');
var logger = require('elogger');

function Query(config) {
	this.dbConfig = {
		server: config.host,
		port: config.port || 1433,
    	user: config.username,
    	password: config.password,
    	database: config.db,
    	options: {
        	encrypt: config.encryption || false,
        	pool: {
                max: 100,
                min: 0,
                idleTimeoutMillis: 30000
            }
    	}
	};
	this.tableName = null;
	this.params = {};
	this.whereParams = {};
}

Query.prototype.table = function(tableName) {
	this.tableName = this.dbConfig.database + '.' + tableName;
	return this;
};

Query.prototype.data = function(paramList) {
	this.params = paramList;
	return this;
};

Query.prototype.order = function(orderbyList) {
	this.orderbyList = orderbyList;
	return this;
};

Query.prototype.limit = function(limit) {
	this.limit = limit;
	return this;
};

Query.prototype.where = function(paramList) {
	this.whereParams = paramList;
	return this;
};

/**
 * run insert query based on the parameters
 * 
 * @param successCallback
 * @param failedCallback
 */
Query.prototype.insert = function(successCallback, failedCallback) {
	var params = this.params;
	var tableName = this.tableName;
	var dbConfig = this.dbConfig;

	var connObj = mssql.connect(dbConfig, function(err) {
		if(err) {
			logger.error(err);
			failedCallback(err);
		}
		else {
			var sql = 'INSERT INTO ' + tableName;
			sql += ' (' + Object.keys(params).join(',') + ') OUTPUT INSERTED.ID AS id VALUES (';
			Object.keys(params).forEach(function(key) {
				sql += '\'' + params[key] + '\', ';
			});
			sql = sql.slice(0, -2);
			sql += ')';
						
			var request = new mssql.Request(connObj);
		    request.query(sql, function(err, recordset) {
		    	connObj.close();
				
		    	if(err) {
		    		logger.debug(sql);
					logger.error(err);
		    		failedCallback(err, sql);
		    	}
		    	else
		    		successCallback(recordset[0]);
		    });
		}
		
	});
};

/**
 * run update query based on the parameters
 * 
 * @param successCallback
 * @param failedCallback
 */
Query.prototype.update = function(successCallback, failedCallback) {
	var tableName = this.tableName;
	var params = this.params;
	var whereParams = this.whereParams;
	var dbConfig = this.dbConfig;
	
	var connObj = mssql.connect(dbConfig, function(err) {
		if(err) {
			logger.error(err);
			failedCallback(err);
		}
		else {
			var sql = 'UPDATE ' + tableName + ' SET ';
			Object.keys(params).forEach(function(key) {
				sql += key + '=' + '\'' + params[key] + '\', ';
			});
			sql = sql.slice(0, -2);
			
			if(whereParams && Object.keys(whereParams).length > 0) {
				sql += ' WHERE ';
				Object.keys(whereParams).forEach(function(key) {
					sql += key + '=' + '\'' + whereParams[key] + '\' AND ';
				});
				sql = sql.slice(0, -5);
			}
			
			var request = new mssql.Request(connObj);
		    request.query(sql, function(err, recordset) {
		    	connObj.close();
				
		    	if(err) {
		    		logger.debug(sql);
					logger.error(err);
		    		failedCallback(err, sql);
		    	}
		    	else
		    		successCallback();
		    });
		}
		
	});
};


/**
 * run basic select query based on the parameters
 * 
 * @param successCallback
 * @param failedCallback
 */
Query.prototype.select = function(successCallback, failedCallback) {
	var tableName = this.tableName;
	var whereParams = this.whereParams;
	var orderbyList = this.orderbyList;
	var dbConfig = this.dbConfig;
	var sql = this.queryStr || '';
	
	var connObj = mssql.connect(dbConfig, function(err) {
		if(err) {
			logger.error(err);
			failedCallback(err);
		}
		
		else {
			var request = new mssql.Request(connObj);
			
			//	use RAW SQL command if available else prepare query from supplied parameters
			if(sql.length == 0) {
				sql = 'SELECT * FROM ' + tableName;
				if(whereParams && Object.keys(whereParams).length > 0) {
					sql += ' WHERE ';
					Object.keys(whereParams).forEach(function(key) {
						sql += key + '=' + '\'' + whereParams[key] + '\' AND ';
					});
					sql = sql.slice(0, -5);
				}
				
				//	check for order by parameter
				if(orderbyList && orderbyList.length > 0) {
					sql += ' ORDER BY ';
					orderbyList.forEach(function(orderByStr) {
						sql += orderByStr + ' ';
					});
				}
			}
			
			request.query(sql, function(err, recordset) {
				connObj.close();
				if(err) {
					logger.debug(sql);
					logger.error(err);
		    		failedCallback(err, sql);
				}
		    	else
		    		successCallback(recordset);
			});
		}
	});
};


/**
 * provide RAW SQL query string. e.g.
 * - SELECT TOP 1000 * FROM dbo.sometable
 * - SELECT TOP 10 * FROM dbo.sometable
 * 
 * @param sql
 * @param successCallback
 * @param failedCallback
 */
Query.prototype.query = function(sql, successCallback, failedCallback) {
	var dbConfig = this.dbConfig;
	var sql = this.queryStr || '';
	
	var connObj = mssql.connect(dbConfig, function(err) {
		if(err) {
			logger.error(err);
			failedCallback(err);
		}
		
		else {
			var request = new mssql.Request();
			request.query(sql, function(err, recordset) {
				connObj.close();
				
				if(err) {
					logger.debug(sql);
					logger.error(err);
		    		failedCallback(err, sql);
				}
		    	else
		    		successCallback(recordset);
			});
		}
	});
};

//	export the class
module.exports = Query;