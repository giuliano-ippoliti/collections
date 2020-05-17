// server.js
// where the node app starts
// TODO: lock dependencies
// TODO: dependences au debut du fichier
// TODO: Helmet

var fsExtra = require('fs-extra');
var fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
var express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');

const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

var app = express();

// Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// session middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

//messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// Load view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Read environment varibale in .env (PORT, ...)
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
// TODO add async
const saveToDbFile = () => {
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

// Home route
app.get('/', (request, response) => {
	response.render('index', {
		collections: collections
	});
});

// LAST
app.get('/new', (request, response) => {
	response.render('new', {
		title: 'Insert new collection'
	});
});

app.get('/add/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('addItem', {
				collection: collection
			});
		}
	});
});

app.get('/modify/:name/:id', (request, response) => {
	const collectionName = request.params.name;
	const itemId = request.params.id;

	var specificItem = {};
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			collection.items.forEach ( (collItem) => {
				if (collItem.id == itemId) {
					specificItem = collItem;
				}
			});

			console.log(specificItem);
			response.render('editItem', {
				collection: collection,
				item: specificItem
			});
		}
	});
});

app.get('/edit/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collection', {
				collection: collection,
				editMode: 1
			});
		}
	});
});

app.post('/modify/:name/:id', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

	const collectionName = request.params.name;
	const itemId = request.params.id;
	const newItem = request.body;

	let thisCollection = {};
	let thisItem = {};

	// prevent API abuse : check existence of collection and item
	// TODO on peut mieux faire
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			thisCollection = collection;
			collection.items.forEach ( (collItem) => {
				if (collItem.id == itemId) {
					thisItem = collItem;
				}
			});
		}
	});
	if ((Object.keys(thisCollection).length === 0) || (Object.keys(thisItem).length === 0))  {
		response.status(404).send('Not found');
	}

	const errors = validationResult(request);

	if (!errors.isEmpty()) {
		response.render('editItem', {
			collection: thisCollection,
			item: thisItem,
			errors: errors.mapped()
		});
	}
	else {
		// check secret
		if (request.body.secret != SECRET) {
			response.render('editItem', {
				collection: thisCollection,
				item: thisItem,
				errors: {
					secret: {
						msg: 'Invalid secret'
					}
				}
			});
		}
		else {
			console.log('API key is ok, authentication succeded');

			// look for the specific item
			collections.forEach( (collection) => {
				if (collection.name == collectionName) {
					collection.items.forEach ( (collItem) => {
						if (collItem.id == itemId) {
							// specific item found, loop through properties (expected for id)
							for (prop in collItem) {
								if (prop == "id") { continue; };	// do not touch the "id" property
								collItem[prop] = newItem[prop];
							}

							saveToDbFile();
							response.render('collection', {
								collection: collection
							});
						}
					});
				}
			});
		}
	}
});

app.post('/new', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

	const collectionName = request.body.name;
	const secret = request.body.secret;
	var inputProperties = request.body.properties;			// TODO forbid special caracters, and final,
	
	// Process properties
	var collectionProperties = inputProperties.replace(/,\s+/g, ',');	// remove spaces after commas
	collectionProperties = collectionProperties.replace(/,+/g, ',');	// deduplicate multiple commas
	collectionProperties = collectionProperties.replace(/,+$/, '');	// remove trailing comma

	var propertiesList = collectionProperties.split(',');

	var duplicatedItems = findDuplicates(propertiesList);

	const errors = validationResult(request);

	if (!errors.isEmpty()) {
		response.render('new', {
			title: 'Insert new collection',
			errors: errors.mapped()
		});
	}
	else {
		if (secret != SECRET) {
			response.render('new', {
				title: 'Insert new collection',
				errors: {
					secret: {
						msg: 'Invalid secret'
					}
				}
			});
		}
		else if (!collectionProperties.match(/^[0-9A-Za-z,]+$/)) {
			response.render('new', {
				title: 'Insert new collection',
				errors: {
					secret: {
						msg: 'Only letters and numbers are allowed for properties'
					}
				}
			});
		}
		else if (duplicatedItems.length > 0) {
			response.render('new', {
				title: 'Insert new collection',
				errors: {
					secret: {
						msg: 'Duplicate properties are not allowed'
					}
				}
			});
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

			if (duplicate == 1) {
				response.render('new', {
					title: 'Insert new collection',
					errors: {
						secret: {
							msg: 'This collection already exists'
						}
					}
				});
			}
			else {	// TODO validate properties
				var newCollection = {};
				newCollection.name = collectionName;
				newCollection.properties = propertiesList;
				newCollection.items = [];	// empty array
				newCollection.lastitemid = 0;

				console.log(newCollection);

				collections.push(newCollection);
				saveToDbFile();

				response.render('index', {
					collections: collections
				});
			}
		}
	}

	
});

app.post('/add/:name', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {
	//console.log(request.params.name, request.body);

	const collectionName = request.params.name;

	let thisCollection = {};
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			thisCollection = collection;
		}
	});

	// collection not found
	if (Object.keys(thisCollection).length === 0) {
		response.status(404).send('Not found');
	}
	// TODO test

	const errors = validationResult(request);

	if (!errors.isEmpty()) {
		response.render('addItem', {
			collection: thisCollection,
			errors: errors.mapped()
		});
	}
	else {
		// check secret
		if (request.body.secret != SECRET) {
			response.render('addItem', {
				collection: thisCollection,
				errors: {
					secret: {
						msg: 'Invalid secret'
					}
				}
			});
		}
		else {
			console.log('API key is ok, authentication succeded');
			let newItem = {};

			for (let [key, value] of Object.entries(request.body)) {
				if (key != 'secret') {
					newItem[key] = value;
				}
			}
			console.log(newItem);

			// look for the right collection
			collections.forEach( (collection) => {
				if (collection.name == collectionName) {
					newItem.id = collection.lastitemid + 1;
					collection.lastitemid += 1;
					collection.items.push(newItem);		// TODO more verifications (API abuse)
					// TODO: Save file before sending the response ? If so then async
					saveToDbFile();

					response.render('collection', {
						collection: collection
					});
				}
			});
		}
	}
  
});

app.get('/show/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			//console.log(collection);
			response.render('collection', {
				collection: collection,
				editMode: 0
			});
		}
	});
});

// listen for requests
var listener = app.listen(PORT, () => {
	console.log('App is listening on port ' + listener.address().port);
});

