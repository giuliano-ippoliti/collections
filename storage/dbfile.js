const fs = require('fs');
const path = require('path');

// Db backend as JSON file
const dbFile = 'collections.json';

// Functions
// TODO add async
const saveToDbFile = () => {
	console.log('Saving to '+dbFile);
	// converting to JSON for storing in db file
	var DbDump = JSON.stringify(collections, null, '  ');

	// await fsExtra.writeJson(dbFile)
	// TODO: try catch
	// new Promise((resolve, reject) => {
	// 	fs.writeFile(dbFile, DbDump, function(err) {
	// 		if (err) {
	// 			console.error(err);
	// 			reject(err)
	// 		}
	// 	});
	// });
	fs.writeFile(dbFile, DbDump, function(err) {
		if (err) {
			console.error(err);
		}
	});
}

module.exports.dbFile = dbFile;
module.exports.saveToDbFile = saveToDbFile;