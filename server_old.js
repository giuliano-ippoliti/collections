// server.js
// where the node app starts
// TODO: lock dependencies
// TODO: dependences au debut du fichier
// TODO: Helmet


// Express web framework for Node.js: https://expressjs.com/
// express is a function
var express = require('express');

// DB as JSON file
var fsExtra = require('fs-extra');
var fs = require('fs');

// Web application instance
var app = express();

// Express Middleware for parsing JSON
app.use(express.json());

// Read environment varibale in .env (PORT, ...)
const dotenv = require('dotenv');
dotenv.config();

// From .env file
const PORT = process.env.PORT;
const SECRET = process.env.SECRET;

// structure for storing the collections:
// - collections (array of {name:, properties:, items:})
// [
//   {
//     "name": "collection1",		// unique
//     "properties": [
//       "p1", "p2", "p3"
//     ],
//     "items": [
//       {
//         "id": "1",
//         "p1": "val1",
//         "p2": "val2"
//       },
//       {
//         "id": "2",
//         "p1": "val3",
//         "p2": "val4"
//       }
//     ],
//     "lastitemid": "2",
//   },
//   ...
// ]
var collections = [];

// Db backend as JSON file
var dbFile = 'collections.json';

// Functions
const saveToDbFile = async () => {
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

// Loading items from Db file at startup
// TODO: Try catch
var exists = fs.existsSync(dbFile);
if (exists) {
	console.log('Database file is ready to go!');

	// read db file for storage in items
	// TODO: Try catch
	// TODO: async ?
	var contents = fs.readFileSync(dbFile);

	// load items to items array
	collections = JSON.parse(contents);
}

// http://expressjs.com/en/starter/static-files.html
// Now we can use files in the public folder, without prefix (cf: app.use('/static', express.static('public')); )
// The public folder contains javascript files
app.use(express.static('public'));

// *** Routes for static files (HTML) ***

//

// home page, which displays the list of collections
app.get('/', (request, response) => {
	response.sendFile(__dirname + '/views/index.html');
});

// page for inserting a new collection
app.get('/insertCollection', (request, response) => {
	response.sendFile(__dirname + '/views/insertCollection.html');
});

// page for inserting an item into a collection
app.get('/insertItem', (request, response) => {
	response.sendFile(__dirname + '/views/insertItem.html');
});

// page for displaying items of a collection
app.get('/displayCollection', (request, response) => {
	response.sendFile(__dirname + '/views/displayCollection.html');
});

// *** Routes for API endpoints ***

// called by index.html
app.get('/api/getCollections', (request, response) => {
	var listOfCollections = [];

	// extract array of name: from collections
	collections.forEach( (collection) => {
		listOfCollections.push(collection.name);
	});

	// TODO: json ?
	// if (err) {
	// 	return response.status(400).json({ test: 'toto'})
	// }

	response.send(JSON.stringify(listOfCollections));
});

// called by insertItem.html
app.post('/api/getCollectionProperties', (request, response) => {
	// extract properties: from collections[name]
	const collectionName = request.body.collectionName;

	var listOfProperties = [];

	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			listOfProperties = collection.properties;
		}
	});

	response.send(JSON.stringify(listOfProperties));
});

// called by displayCollection.html
app.post('/api/getCollectionItems', (request, response) => {
	// extract items: from collections[name]
	const collectionName = request.body.collectionName;

	var listOfItems = [];
	collections.forEach( (collection) => {
		// TODO: strict comparaison with ===
		if (collection.name == collectionName) {
			listOfItems = collection.items;
		}
	});

	response.send(JSON.stringify(listOfItems));
});

// called by insertItem.html
app.post('/api/getCollectionSpecificItem', (request, response) => {
	const collectionName = request.body.collectionName;
	const itemId = request.body.itemId;

	var specificItem = {};
	// look for matching collection (name) and item (id)
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			collection.items.forEach ( (collItem) => {
				if (collItem.id == itemId) {
					specificItem = collItem;
				}
			});
		}
	});

	response.send(JSON.stringify(specificItem));
});

// called by insertItem.html
app.post('/api/insertItemInCollection', (request, response) => {
	const collectionName = request.body.collectionName;
	const newItem = request.body.item;
	const apisecret = request.body.secret;

	const itemId = newItem.itemId;		// only set for editing an item

	console.log('/api/insertItemInCollection', newItem);

	if (apisecret == SECRET) {
		console.log('API key is ok, authentication succeded');

		// look for the right collection
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				if (itemId == undefined) {			// insert new item
					newItem.id = collection.lastitemid + 1;
					collection.lastitemid += 1;
					collection.items.push(newItem);		// TODO more verifications (API abuse)
					// TODO: Save file before sending the response ? If so then async
					saveToDbFile();
					response.send(JSON.stringify(newItem));
				}
				else {						// modify existing item
					// look for the specific item
					collection.items.forEach ( (collItem) => {
						if (collItem.id == itemId) {
							// specific item found, loop through properties (expected for id)
							for (prop in collItem) {
								if (prop == "id") { continue; };	// do not touch the "id" property
								collItem[prop] = newItem[prop];
							}
						}
					});
					saveToDbFile();
					response.send(JSON.stringify(newItem));
				}
			}
		});
	}
	else {
		console.log('API key is NOT ok, authentication failed');
		response.sendStatus(403);
	}
});

// called by insertCollection.html
app.post('/api/insertCollection', (request, response) => {
	const collectionName = request.body.collectionName;
	const collectionProperties = request.body.collectionProperties;
	const apisecret = request.body.secret;

	var newCollection = {};

	if (apisecret != SECRET) {
		console.log('API key is NOT ok, authentication failed');
		response.sendStatus(403);
	}
	else {
		console.log('API key is ok, authentication succeded');

		// check if a collection with the same name exists
		var duplicate = 0;
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				duplicate = 1;
			}
		});

		if (duplicate == 0) {
			newCollection.name = collectionName;
			newCollection.properties = collectionProperties;
			newCollection.items = [];	// empty array
			newCollection.lastitemid = 0;

			console.log(newCollection);

			collections.push(newCollection);
			saveToDbFile();
		}

		response.send(JSON.stringify(newCollection));
	}

});

// listen for requests
var listener = app.listen(PORT, () => {
	console.log('App is listening on port ' + listener.address().port);
});

