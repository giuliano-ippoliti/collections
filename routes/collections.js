const express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');

const db = require('../storage/dbfile');

const router = express.Router();

// Functions
const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

// GET routes

// Homepage
router.get('/', (request, response) => {
	response.render('index', {
		collections: collections
	});
});

// New collection
router.get('/new', (request, response) => {
	response.render('new', {
		title: 'Insert new collection'
	});
});

// Add item into a collection
router.get('/add/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('addItem', {
				collection: collection
			});
		}
	});
});

// Display a collection
router.get('/show/:name', (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collection', {
				collection: collection,
				editMode: 0
			});
		}
	});
});

// Display a collection in edit mode (ids are shown and clickable)
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

// Display form for deleting a collection
router.get('/delete/:name', (request, response) => {
	response.render('deleteCollection', {
		collection: request.params.name
	});
});

// Display form for modifying an item
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

			response.render('editItem', {
				collection: collection,
				item: specificItem
			});
		}
	});
});

// POST routes

// Delete a collection
router.post('/delete/:name', (request, response) => {
    const secret = request.body.secret;
    const collectionName = request.params.name;

    // check secret
    if (secret != SECRET) {
        response.render('deleteCollection', {
            collection: collectionName,
            errors: {
                secret: {
                    msg: 'Invalid secret'
                }
            }
        });
    }
    else {
        var filteredCollections = collections.filter(collection => collection.name != collectionName);

        collections = filteredCollections;
        db.saveToDbFile();
        request.flash('success', 'Collection deleted');
        response.redirect('/');
    }
});

// Add a new collection
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

				collections.push(newCollection);
				db.saveToDbFile();

                request.flash('success', 'Collection added');
				response.render('index', {
					collections: collections
				});
			}
		}
	}	
});

// Add a new item in a collection
router.post('/add/:name', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

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

			// look for the right collection
			collections.forEach( (collection) => {
				if (collection.name == collectionName) {
					newItem.id = collection.lastitemid + 1;
					collection.lastitemid += 1;
					collection.items.push(newItem);		// TODO more verifications (API abuse)
					// TODO: Save file before sending the response ? If so then async
					db.saveToDbFile();

                    request.flash('success', 'Item added');
					response.render('collection', {
						collection: collection
					});
				}
			});
		}
	}  
});

// Modify an item in a collection
router.post('/modify/:name/:id', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

	const collectionName = request.params.name;
	const itemId = request.params.id;
	const newItem = request.body;           //it includes the name of the button (_btn)
    const formAction = request.body._btn;   // Save or Delete

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
                            request.flash('success', 'Item modified');
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

module.exports = router;