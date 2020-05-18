const express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');

const db = require('../storage/dbfile');

const router = express.Router();

// Functions
const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

// Home route
router.get('/', (request, response) => {
	response.render('index', {
		collections: collections
	});
});

// LAST
router.get('/new', (request, response) => {
	response.render('new', {
		title: 'Insert new collection'
	});
});

router.get('/add/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('addItem', {
				collection: collection
			});
		}
	});
});

router.get('/modify/:name/:id', (request, response) => {
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

router.get('/edit/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collection', {
				collection: collection,
				editMode: 1
			});
		}
	});
});

router.post('/modify/:name/:id', [
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

							db.saveToDbFile();
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

router.post('/new', [
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
				db.saveToDbFile();

				response.render('index', {
					collections: collections
				});
			}
		}
	}

	
});

router.post('/add/:name', [
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
					db.saveToDbFile();

					response.render('collection', {
						collection: collection
					});
				}
			});
		}
	}
  
});

router.get('/show/:name', (request, response) => {
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

module.exports = router;