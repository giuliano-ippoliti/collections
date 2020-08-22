const fs = require('fs').promises;
const path = require('path');

// Db backend as JSON file
const dbFile = 'collections.json';
const usersFile = 'users.json';

// Functions
const loadDbFile = async () => {
	try {
		// read db file for storage in items
		var contents = await fs.readFile(dbFile);

		console.log('Database file is ready to go!');

		// load items to items array
		collections = JSON.parse(contents);
	}
	catch (error) {
		console.log(error);
	}
}

const saveToDbFile = async () => {
	console.log('Saving to '+dbFile);
	// converting to JSON for storing in db file
	var DbDump = JSON.stringify(collections, null, '  ');

	try {
		await fs.writeFile(dbFile, DbDump);
	}
	catch (error) {
		console.error(err);
	}
}

const loadUsersFile = async () => {
	try {
		// read db file for storage in items
		var contents = await fs.readFile(usersFile);

		console.log('Users file is ready to go!');

		// load items to items array
		registeredUsers = JSON.parse(contents);
	}
	catch (error) {
		console.log(error);
	}
}

const saveToUsersFile = async () => {
	console.log('Saving to '+usersFile);
	// converting to JSON for storing in db file
	var usersDump = JSON.stringify(registeredUsers, null, '  ');

	try {
		await fs.writeFile(usersFile, usersDump);
	}
	catch (error) {
		console.error(err);
	}
}

module.exports.dbFile = dbFile;
module.exports.loadDbFile = loadDbFile;
module.exports.saveToDbFile = saveToDbFile;
module.exports.loadUsersFile = loadUsersFile;
module.exports.saveToUsersFile = saveToUsersFile;