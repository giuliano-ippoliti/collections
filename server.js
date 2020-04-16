// server.js
// where your node app starts

// Express web framework for Node.js: https://expressjs.com/
// express is a function
var express = require('express');

// Node.js body parsing middleware.
// Parse incoming request bodies in a middleware before your handlers, available under the req.body property
var bodyParser = require('body-parser');

// Read environment varibale in .env (PORT, ...)
const dotenv = require('dotenv');
dotenv.config();

// DB as JSON file
var fs = require('fs');

// From .env file
const PORT = process.env.PORT;
const SECRET = process.env.SECRET;

// array of objects (items)
var collections = [];

var dbFile = 'collections.json';

// Functions
const saveToDbFile = () => {
	// converting to JSON for storing in db file
	var DbDump = JSON.stringify(collections, null, '  ');

	fs.writeFile(dbFile, DbDump, function(err) {
		if (err) {
			console.log(err);
		}
	});
}

// Loading items
var exists = fs.existsSync(dbFile);
if (exists) {
	console.log('Database file is ready to go!');

	// read db file for storage in items
	var contents = fs.readFileSync(dbFile);

	// load items to items array
	collections = JSON.parse(contents);

	//console.log('Loaded: ', collections);
}

// Web application instance
var app = express();

// Express Middlewares

// parse JSON
app.use(bodyParser.json());

// http://expressjs.com/en/starter/static-files.html
// Now we can use files in the public folder, without prefix (cf: app.use('/static', express.static('public')); )
app.use(express.static('public'));

// Static files

app.get('/', (request, response) => {
	response.sendFile(__dirname + '/views/index.html');
});

app.get('/insertCollection', (request, response) => {
	response.sendFile(__dirname + '/views/insertCollection.html');
});

app.get('/insertItem', (request, response) => {
	response.sendFile(__dirname + '/views/insertItem.html');
});

app.get('/displayCollection', (request, response) => {
	response.sendFile(__dirname + '/views/displayCollection.html');
});

// API endpoints

// structure:
// - collections (array of {name:, properties:, items:})
// [
//   {
//     "name": "collection1",
//     "properties": [
//       "p1", "p2", "p3"
//     ],
//     "items": [
//       {
//         "p1": "val1",
//         "p2": "val2"
//       },
//       {
//         "p1": "val3",
//         "p2": "val4"
//       }
//     ]
//   },

// TODO rajouter /collection/<name> ?!

// called by index.html
app.get('/api/getCollections', (request, response) => {
	var listOfCollections = [];

	// extract array of name: from collections
	collections.forEach( (collection) => {
		listOfCollections.push(collection.name);
	});

	response.send(JSON.stringify(listOfCollections));
});

// called by insertItem.html
// get properties
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

	var listOfItems = {};
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			listOfItems = collection.items;
		}
	});

	response.send(JSON.stringify(listOfItems));
});

// called by insertItem.html
app.post('/api/insertItemInCollection', (request, response) => {
	const collectionName = request.body.collectionName;
	const newItem = request.body.item;
	const apisecret = request.body.secret;

	console.log('/api/insertItemInCollection', newItem);

	if (apisecret == SECRET) {
		console.log('API key is ok, authentication succeded');

		// look for the right collection
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				collection.items.push(newItem);		// TODO more verifications
				saveToDbFile();
				response.send(JSON.stringify(newItem));
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

			console.log(newCollection);

			collections.push(newCollection);
			saveToDbFile();
		}

		response.send(JSON.stringify(newCollection));
	}
	
});

// listen for requests
var listener = app.listen(PORT, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});

