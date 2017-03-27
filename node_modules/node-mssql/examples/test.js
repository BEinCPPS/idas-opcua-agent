var mssql_wrapper = require('../wrapper');

var queryObj = new mssql_wrapper.Query({
	host: '192.168.100.1',
	port: 1433,
	username: 'epdba',
	password: 'epdba',
	database: 'testwrapper'
});
queryObj.table('dbo.mytable')
.data({
	'title': 'MyTest',
	'description': 'desc'
})
.where({
	'title': 'Myest',
})
.insert(function(results) {
	console.log(results);
	process.exit();
}, function(err, sql) {
	if(err)
		console.log(err);
	
	console.log(sql);
});