const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');

const db = require('../storage/dbfile');
const text = require('../lang/text');

const router = express.Router();

// Functions
const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

const sanitizeProperties = (inputProperties) => {
	var properties = inputProperties.replace(/,\s+/g, ',');	// remove spaces after commas
	properties = properties.replace(/,+/g, ',');	// deduplicate multiple commas
	properties = properties.replace(/,+$/, '');	// remove trailing comma

	if (!properties) {
		return ['ERR_Empty'];
	}
	else if (!properties.match(/^[0-9A-Za-zàâçéèêëîïôûùüÿñæœ,]+$/)) {
		return ['ERR_InvalidChar'];
	}

	var propertiesList =  properties.split(',');

	var duplicatedItems = findDuplicates(propertiesList);
	if (duplicatedItems.length > 0) {
		return ['ERR_DuplicatedItems'];
	}

	return propertiesList;
}

// GET routes

// Homepage
router.get('/', (request, response) => {
	response.render('homepage', {
		collections: collections
	});
});

router.get('/pro', (request, response) => {
	response.render('pro', {
		collections: collections
	});
});

router.get('/perso', (request, response) => {
	response.render('perso', {
		collections: collections
	});
});

router.get('/ressources', (request, response) => {
	response.render('ressources', {});
});

// Pages dans ressources (peut-être mieux de mettre en statique)
router.get('/AZ500', (request, response) => {
	response.render('AZ500', {});
});

// Gestion des collections
router.get('/collections', ensureAuthenticated, (request, response) => {
	if (request.query.ok) {
		request.flash('success', request.query.ok);
	}
	if (request.query.ko) {
		request.flash('danger', request.query.ko);
	}
	response.render('index', {
		collections: collections
	});
});

// New collection
router.get('/writeCollection', ensureAuthenticated, (request, response) => {
	response.render('collectionDetails', {
		title: 'Insert new collection',
		createMode: 1,
		mandatory: MANDATORY_COLLECTION_PROPERTY
	});
});

router.get('/export', ensureAuthenticated, (request, response) => {
	response.send(collections);
	//response.sendFile(path.join(__dirname, '../'+db.dbFile));
});

router.get('/export/:name', ensureAuthenticated, (request, response) => {
	var found = 0;
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			found = 1;
			response.send(collection);
			return;
		}
	});
	if (!found) response.status(404).send('Not found');
});

// Modify collection's properties
router.get('/change/:name', ensureAuthenticated, (request, response) => {
	const collectionName = request.params.name;

	var displayName = "";
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			displayName = collection.displayName;
		}
	});

	response.render('collectionDetails', {
		title: 'Add new properties for '+collectionName,
		collectionName: collectionName,
		displayName: displayName,
		createMode: 0
	});
});

// Add item into a collection
router.get('/add/:name', ensureAuthenticated, (request, response) => {
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
	var fullDisplay = 0;

	if (request.isAuthenticated()) {
		fullDisplay = 1;
	}

	if (request.query.ok) {
		request.flash('success', request.query.ok);
	}
	if (request.query.ko) {
		request.flash('danger', request.query.ko);
	}

	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collectionDynamic', {
				collection: collection,
				fullDisplay: fullDisplay
			});
		}
	});
});

// Display a collection with DataTable
router.get('/showStatic/:name', ensureAuthenticated, (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collectionStatic', {
				collection: collection,
				editMode: 0
			});
		}
	});
});

// Display a collection in edit mode (ids are shown and clickable)
router.get('/edit/:name', ensureAuthenticated, (request, response) => {
	collections.forEach( (collection) => {
		if (collection.name == request.params.name) {
			response.render('collectionStatic', {
				collection: collection,
				editMode: 1
			});
		}
	});
});

// Display form for modifying an item
router.get('/modify/:name/:id', ensureAuthenticated, (request, response) => {
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
router.delete('/delete/:name', ensureAuthenticated, (request, response) => {
    const collectionName = request.params.name;

	var filteredCollections = collections.filter(collection => collection.name != collectionName);

	collections = filteredCollections;
	db.saveToDbFile();

	response.sendStatus(200);
});

// Add a new collection, or change its properties
// TODO : nettoyer et pousser sur github
// TODONICE : put pour modifier collection
router.post('/writeCollection', [
	check('name').isLength({min:1}).withMessage('Name required for the new collection'),
	], (request, response) => {
	const collectionName = request.body.name;
	const displayName = request.body.displayName;
	const shortInputProperties = request.body.shortProperties;
	const longInputProperties = request.body.longProperties;
	const formAction = request.body._btn;   // Add or Modify

	if (!request.isAuthenticated()) {
		response.sendStatus(403);
		return;
	}

	var createMode = 0;
	var title = 'Add new properties for '+collectionName;
	if (formAction == 'Add') {
		createMode = 1;
		title = 'Insert new collection';
	}

	// First-level input validation
	const errors = validationResult(request);
	if (!errors.isEmpty()) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			errors: errors.mapped()
		});
		return;
	}

	// Process properties
	var shortPropertiesList = sanitizeProperties(shortInputProperties);
	var longPropertiesList = sanitizeProperties(longInputProperties);

	if (createMode && (!shortPropertiesList.find(elem => elem === MANDATORY_COLLECTION_PROPERTY))) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			mandatory: MANDATORY_COLLECTION_PROPERTY,
			errors: {
				secret: {
					msg: 'You must declare at least one short property named "' + MANDATORY_COLLECTION_PROPERTY + '"'
				}
			}
		});
		return;
	}
	else if ((shortPropertiesList[0] == 'ERR_Empty') && (longPropertiesList[0] == 'ERR_Empty')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				secret: {
					msg: 'You must declare at least one property'
				}
			}
		});
		return;
	}
	else if ((shortPropertiesList[0] == 'ERR_InvalidChar') || (longPropertiesList[0] == 'ERR_InvalidChar')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				secret: {
					msg: 'Only letters and numbers are allowed for properties'
				}
			}
		});
		return;
	}
	else if ((shortPropertiesList[0] == 'ERR_DuplicatedItems') || (longPropertiesList[0] == 'ERR_DuplicatedItems')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				secret: {
					msg: 'Duplicate properties are not allowed'
				}
			}
		});
		return;
	}

	// Check for duplicates
	// Properties
	if (createMode) {
		// a bit easier to check as all properties are new
		var duplicateProperties = findDuplicates(shortPropertiesList.concat(longPropertiesList));
		if (duplicateProperties.length > 0) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					secret: {
						msg: 'Duplicate properties are not allowed'
					}
				}
			});
			return;
		}
	}
	else {
		// concat new and existing properties to check for dublicates
		// look for existing properties in the collection
		var existingProperties = [];
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				existingProperties = collection.shortProperties.concat(collection.longProperties);
			}
		});
		var newProperties = shortPropertiesList.concat(longPropertiesList);
		var duplicateProperties = findDuplicates(existingProperties.concat(newProperties));
		if (duplicateProperties.length > 0) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					secret: {
						msg: 'Some new properties already exist, this is not allowed'
					}
				}
			});
			return;
		}
	}

	// Collection (ne need to check if not in createMode)
	if (createMode) {
		var duplicateCollection = 0;
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				duplicateCollection = 1;
			}
		});
		if (duplicateCollection == 1) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					secret: {
						msg: 'This collection already exists'
					}
				}
			});
			return;
		}
	}

	console.log('Validation checks are ok, API key is ok, authentication succeded');

	// filter error messages in properties... a bit artificial TODO
	shortPropertiesList = shortPropertiesList.filter(prop => !prop.match(/ERR_/));
	longPropertiesList = longPropertiesList.filter(prop => !prop.match(/ERR_/));

	if (createMode) {
		var newCollection = {};
		newCollection.name = collectionName;
		newCollection.displayName = displayName;
		newCollection.shortProperties = shortPropertiesList;
		newCollection.longProperties = longPropertiesList;
		newCollection.items = [];	// empty array
		newCollection.lastitemid = 0;

		collections.push(newCollection);
	}
	else {
		collections.forEach( (collection) => {
			if (collection.name == collectionName) {
				collection.displayName = displayName;
				collection.shortProperties = collection.shortProperties.concat(shortPropertiesList);
				collection.longProperties = collection.longProperties.concat(longPropertiesList);
				collection.items.forEach ( (collItem) => {
					shortPropertiesList.forEach( (sp) => collItem[sp] = '');
					longPropertiesList.forEach( (lp) => collItem[lp] = '');
				});
			}
		});
	}

	db.saveToDbFile();

	if (createMode) {
		request.flash('success', 'Collection added');
	}
	else {
		request.flash('success', 'New properties added to '+collectionName);
	}
	response.render('index', {
		collections: collections
	});
});

// Add a new item in a collection
router.post('/add/:name', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

	if (!request.isAuthenticated()) {
		response.sendStatus(403);
		return;
	}

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
				db.saveToDbFile();

				request.flash('success', 'Item added');
				response.render('collectionDynamic', {
					collection: collection,
					fullDisplay: 1
				});
			}
		});
	}  
});

// Modify an item in a collection
router.post('/modify/:name/:id', [
	check('*').isLength({min:1}).withMessage('Value required'),
	], (request, response) => {

	if (!request.isAuthenticated()) {
		response.sendStatus(403);
		return;
	}

	const collectionName = request.params.name;
	const itemId = request.params.id;
	const newItem = request.body;           //it includes the name of the button (_btn)
    //const formAction = request.body._btn;   // Save or Delete

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
						response.render('collectionStatic', {
							collection: collection
						});
					}
				});
			}
		});
	}
});

router.delete('/modify/:name/:id', ensureAuthenticated, (request, response) => {
	const collectionName = request.params.name;
	const itemId = request.params.id;

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

	// look for the specific item
	collections.forEach( (collection) => {
		if (collection.name == collectionName) {
			// Delete
			let filteredItems = collection.items.filter(item => item.id != itemId);
			collection.items = filteredItems;

			db.saveToDbFile();

			response.sendStatus(200);
		}
	});
});

// Access controls
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	else {
		req.flash('danger', 'Please login');
		res.redirect('/users/login');
	}
}

module.exports = router;