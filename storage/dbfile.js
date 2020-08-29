/* eslint-disable linebreak-style */
/* eslint-disable indent */
/* eslint-disable no-tabs */
/* eslint-disable no-console */
/* global collections, registeredUsers */
const fs = require('fs').promises;

// Db backend as JSON file
const dbFile = 'collections.json';
const usersFile = 'users.json';

// Functions
const loadDbFile = async () => {
	try {
		// read db file for storage in items
		const contents = await fs.readFile(dbFile);

		console.log('Database file is ready to go!');

		// load items to items array
		// eslint-disable-next-line no-global-assign
		collections = JSON.parse(contents);
	} catch (error) {
		console.log(error);
	}
};

const saveToDbFile = async () => {
	console.log(`Saving to ${dbFile}`);
	// converting to JSON for storing in db file
	const DbDump = JSON.stringify(collections, null, '  ');

	try {
		await fs.writeFile(dbFile, DbDump);
	} catch (error) {
		console.error(error);
	}
};

const loadUsersFile = async () => {
	try {
		// read db file for storage in items
		const contents = await fs.readFile(usersFile);

		console.log('Users file is ready to go!');

		// load items to items array
		// eslint-disable-next-line no-global-assign
		registeredUsers = JSON.parse(contents);
	} catch (error) {
		console.log(error);
	}
};

const saveToUsersFile = async () => {
	console.log(`Saving to ${usersFile}`);
	// converting to JSON for storing in db file
	const usersDump = JSON.stringify(registeredUsers, null, '  ');

	try {
		await fs.writeFile(usersFile, usersDump);
	} catch (error) {
		console.error(error);
	}
};

module.exports.dbFile = dbFile;
module.exports.loadDbFile = loadDbFile;
module.exports.saveToDbFile = saveToDbFile;
module.exports.loadUsersFile = loadUsersFile;
module.exports.saveToUsersFile = saveToUsersFile;
