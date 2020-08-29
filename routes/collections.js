/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* eslint-disable object-shorthand */
/* eslint-disable indent */
/* eslint-disable no-tabs */
/* global collections, MANDATORY_COLLECTION_PROPERTY */
/* eslint no-underscore-dangle: ["error", { "allow": ["_btn"] }] */
const express = require('express');
const { check, validationResult } = require('express-validator');

const db = require('../storage/dbfile');

const router = express.Router();

// Functions
const findDuplicates = (arr) => arr.filter((item, index) => arr.indexOf(item) !== index);

const sanitizeProperties = (inputProperties) => {
	let properties = inputProperties.replace(/,\s+/g, ',');	// remove spaces after commas
	properties = properties.replace(/,+/g, ',');	// deduplicate multiple commas
	properties = properties.replace(/,+$/, '');	// remove trailing comma

	if (!properties) {
		return ['ERR_Empty'];
	}
	if (!properties.match(/^[0-9A-Za-zàâçéèêëîïôûùüÿñæœ,]+$/)) {
		return ['ERR_InvalidChar'];
	}

	const propertiesList = properties.split(',');

	const duplicatedItems = findDuplicates(propertiesList);
	if (duplicatedItems.length > 0) {
		return ['ERR_DuplicatedItems'];
	}

	return propertiesList;
};

// Access controls
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('danger', 'Please login');
	res.redirect('/users/login');
	return null;
}

// GET routes

// Homepage
router.get('/', (request, response) => {
	response.render('homepage', {
		collections: collections,
	});
});

router.get('/pro', (request, response) => {
	response.render('pro', {
		collections: collections,
	});
});

router.get('/perso', (request, response) => {
	response.render('perso', {
		collections: collections,
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
		collections: collections,
	});
});

// New collection
router.get('/writeCollection', ensureAuthenticated, (request, response) => {
	response.render('collectionDetails', {
		title: 'Insert new collection',
		createMode: 1,
		mandatory: MANDATORY_COLLECTION_PROPERTY,
	});
});

router.get('/export', ensureAuthenticated, (request, response) => {
	response.send(collections);
});

router.get('/export/:name', ensureAuthenticated, (request, response) => {
	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);

	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		response.send(collections[cIndex]);
	}
});

// Modify collection's properties
router.get('/change/:name', ensureAuthenticated, (request, response) => {
	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);

	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		const collectionName = collections[cIndex].name;
		const { displayName } = collections[cIndex];

		response.render('collectionDetails', {
			title: `Add new properties for ${collectionName}`,
			collectionName: collectionName,
			displayName: displayName,
			createMode: 0,
		});
	}
});

// Add item into a collection
router.get('/add/:name', ensureAuthenticated, (request, response) => {
	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);
	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		response.render('addItem', {
			collection: collections[cIndex],
		});
	}
});

// Display a collection
router.get('/show/:name', (request, response) => {
	let fullDisplay = 0;

	if (request.isAuthenticated()) {
		fullDisplay = 1;
	}

	if (request.query.ok) {
		request.flash('success', request.query.ok);
	}
	if (request.query.ko) {
		request.flash('danger', request.query.ko);
	}

	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);

	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		response.render('collectionDynamic', {
			collection: collections[cIndex],
			fullDisplay: fullDisplay,
		});
	}
});

// Display a collection with DataTable
router.get('/showStatic/:name', ensureAuthenticated, (request, response) => {
	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);

	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		response.render('collectionStatic', {
			collection: collections[cIndex],
			editMode: 0,
		});
	}
});

// Display a collection in edit mode (ids are shown and clickable)
router.get('/edit/:name', ensureAuthenticated, (request, response) => {
	const cIndex = collections.findIndex((collection) => collection.name === request.params.name);

	if (cIndex === -1) {
		response.status(404).render('404');
	} else {
		response.render('collectionStatic', {
			collection: collections[cIndex],
			editMode: 1,
		});
	}
});

// Display form for modifying an item
router.get('/modify/:name/:id', ensureAuthenticated, (request, response) => {
	const collectionName = request.params.name;
	const itemId = request.params.id;

	const cIndex = collections.findIndex((collection) => collection.name === collectionName);
	if (cIndex === -1) {
		response.status(404).render('404');
		return;
	}
	// eslint-disable-next-line max-len
	const iIndex = collections[cIndex].items.findIndex((collItem) => collItem.id.toString() === itemId);
	if (iIndex === -1) {
		response.status(404).render('404');
		return;
	}

	response.render('editItem', {
		collection: collections[cIndex],
		item: collections[cIndex].items[iIndex],
	});
});

// POST routes

// Add a new collection, or change its properties
// TODO route trop grosse, factoriser
// TODONICE : put pour modifier collection
router.post('/writeCollection', [
	check('name').isLength({ min: 1 }).withMessage('Name required for the new collection'),
	ensureAuthenticated,
	], (request, response) => {
	const collectionName = request.body.name;
	// eslint-disable-next-line prefer-destructuring
	const displayName = request.body.displayName;
	const shortInputProperties = request.body.shortProperties;
	const longInputProperties = request.body.longProperties;
	const formAction = request.body._btn; // Add or Modify

	const cIndex = collections.findIndex((collection) => collection.name === collectionName);

	let createMode = 0;
	let title = `Add new properties for ${collectionName}`;
	if (formAction === 'Add') {
		createMode = 1;
		title = 'Insert new collection';
	}

	// First-level input validation
	const errors = validationResult(request);
	if (!errors.isEmpty()) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			errors: errors.mapped(),
		});
		return;
	}

	// Process properties
	let shortPropertiesList = sanitizeProperties(shortInputProperties);
	let longPropertiesList = sanitizeProperties(longInputProperties);

	if (createMode && (!shortPropertiesList.find((elem) => elem === MANDATORY_COLLECTION_PROPERTY))) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			mandatory: MANDATORY_COLLECTION_PROPERTY,
			errors: {
				details: {
					msg: `You must declare at least one short property named "${MANDATORY_COLLECTION_PROPERTY}"`,
				},
			},
		});
		return;
	}
	if ((shortPropertiesList[0] === 'ERR_Empty') && (longPropertiesList[0] === 'ERR_Empty')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				details: {
					msg: 'You must declare at least one property',
				},
			},
		});
		return;
	}
	if ((shortPropertiesList[0] === 'ERR_InvalidChar') || (longPropertiesList[0] === 'ERR_InvalidChar')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				details: {
					msg: 'Only letters and numbers are allowed for properties',
				},
			},
		});
		return;
	}
	if ((shortPropertiesList[0] === 'ERR_DuplicatedItems') || (longPropertiesList[0] === 'ERR_DuplicatedItems')) {
		response.render('collectionDetails', {
			title: title,
			createMode: createMode,
			collectionName: collectionName,
			errors: {
				details: {
					msg: 'Duplicate properties are not allowed',
				},
			},
		});
		return;
	}

	// Check for duplicates
	if (createMode) {
		// check for duplicated collection
		if (cIndex !== -1) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					details: {
						msg: 'This collection already exists',
					},
				},
			});
			return;
		}
		// check for duplicated properties
		const duplicateProperties = findDuplicates(shortPropertiesList.concat(longPropertiesList));
		if (duplicateProperties.length > 0) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					details: {
						msg: 'Duplicate properties are not allowed',
					},
				},
			});
			return;
		}
	} else {
		// createMode is 0, attempt to modify existing collection
		// Look for the collection, if it does not exist: 404
		if (cIndex === -1) {
			response.status(404).render('404');
			return;
		}

		// concat new and existing properties to check for dublicates
		// look for existing properties in the collection
		// eslint-disable-next-line max-len
		const existingProperties = collections[cIndex].shortProperties.concat(collections[cIndex].longProperties);

		const newProperties = shortPropertiesList.concat(longPropertiesList);
		const duplicateProperties = findDuplicates(existingProperties.concat(newProperties));
		if (duplicateProperties.length > 0) {
			response.render('collectionDetails', {
				title: title,
				createMode: createMode,
				collectionName: collectionName,
				errors: {
					details: {
						msg: 'Some new properties already exist, this is not allowed',
					},
				},
			});
			return;
		}
	}

	console.log('Validation checks are ok, API key is ok, authentication succeded');

	// filter error messages in properties... a bit artificial TODO
	shortPropertiesList = shortPropertiesList.filter((prop) => !prop.match(/ERR_/));
	longPropertiesList = longPropertiesList.filter((prop) => !prop.match(/ERR_/));

	if (createMode) {
		const newCollection = {};
		newCollection.name = collectionName;
		newCollection.displayName = displayName;
		newCollection.shortProperties = shortPropertiesList;
		newCollection.longProperties = longPropertiesList;
		newCollection.items = [];	// empty array
		newCollection.lastitemid = 0;

		collections.push(newCollection);
	} else {
		// eslint-disable-next-line max-len
		collections[cIndex].shortProperties = collections[cIndex].shortProperties.concat(shortPropertiesList);
		// eslint-disable-next-line max-len
		collections[cIndex].longProperties = collections[cIndex].longProperties.concat(longPropertiesList);

		for (let i = 1; i <= collections[cIndex].lastitemid; i += 1) {
			// eslint-disable-next-line max-len
			const iIndex = collections[cIndex].items.findIndex((collItem) => collItem.id === i);
			// eslint-disable-next-line no-loop-func
			shortPropertiesList.forEach((sp) => {
				if (collections[cIndex].items[iIndex]) {
					collections[cIndex].items[iIndex][sp] = '';
				}
			});
			// eslint-disable-next-line no-loop-func
			longPropertiesList.forEach((lp) => {
				if (collections[cIndex].items[iIndex]) {
					collections[cIndex].items[iIndex][lp] = '';
				}
			});
		}
	}

	db.saveToDbFile();

	if (createMode) {
		request.flash('success', 'Collection added');
	} else {
		request.flash('success', `New properties added to ${collectionName}`);
	}
	response.render('index', {
		collections: collections,
	});
});

// Add a new item in a collection
router.post('/add/:name', [
	check('*').isLength({ min: 1 }).withMessage('Value required'),
	ensureAuthenticated,
	], (request, response) => {
	const collectionName = request.params.name;

	const cIndex = collections.findIndex((collection) => collection.name === collectionName);
	if (cIndex === -1) {
		response.status(404).render('404');
		return;
	}

	const errors = validationResult(request);

	if (!errors.isEmpty()) {
		response.render('addItem', {
			collection: collections[cIndex],
			errors: errors.mapped(),
		});
	} else {
		const newItem = {};

		// eslint-disable-next-line no-restricted-syntax
		for (const [key, value] of Object.entries(request.body)) {
			newItem[key] = value;
		}

		newItem.id = collections[cIndex].lastitemid + 1;
		collections[cIndex].lastitemid += 1;
		collections[cIndex].items.push(newItem); // TODO more verifications (API abuse)

		db.saveToDbFile();

		request.flash('success', 'Item added');
		response.render('collectionDynamic', {
			collection: collections[cIndex],
			fullDisplay: 1,
		});
	}
});

// Modify an item in a collection
router.post('/modify/:name/:id', [
	check('*').isLength({ min: 1 }).withMessage('Value required'),
	ensureAuthenticated,
	], (request, response) => {
	const collectionName = request.params.name;
	const itemId = request.params.id;
	const newItem = request.body; // it includes the name of the button (_btn) TODO ?!

	/* let thisCollection = {};
	let thisItem = {}; */

	// prevent API abuse : check existence of collection and item
	// TODO on peut mieux faire
	// TODO test
	const cIndex = collections.findIndex((collection) => collection.name === collectionName);
	if (cIndex === -1) {
		response.status(404).render('404');
		return;
	}
	// thisCollection = collections[cIndex];
	// eslint-disable-next-line max-len
	const iIndex = collections[cIndex].items.findIndex((collItem) => collItem.id.toString() === itemId);
	if (iIndex === -1) {
		response.status(404).render('404');
		return;
	}
	// thisItem = collections[cIndex].items[iIndex];

	const errors = validationResult(request);

	if (!errors.isEmpty()) {
		response.render('editItem', {
			collection: collections[cIndex],
			item: collections[cIndex].items[iIndex],
			errors: errors.mapped(),
		});
	} else {
		Object.keys(collections[cIndex].items[iIndex]).forEach((prop) => {
			if (prop !== 'id') {
				collections[cIndex].items[iIndex][prop] = newItem[prop];
			}
		});

		db.saveToDbFile();
		request.flash('success', 'Item modified');
		response.render('collectionStatic', {
			collection: collections[cIndex],
		});
	}
});

// DELETE routes
// Delete a collection
router.delete('/delete/:name', ensureAuthenticated, (request, response) => {
    const collectionName = request.params.name;

	// eslint-disable-next-line max-len
	const filteredCollections = collections.filter((collection) => collection.name !== collectionName);

	// eslint-disable-next-line no-global-assign
	collections = filteredCollections;
	db.saveToDbFile();

	response.sendStatus(200);
});

// Delete item in a collection
router.delete('/modify/:name/:id', ensureAuthenticated, (request, response) => {
	const collectionName = request.params.name;
	const itemId = request.params.id;

	const cIndex = collections.findIndex((collection) => collection.name === collectionName);
	if (cIndex === -1) {
		response.status(404).render('404');
		return;
	}

	const filteredItems = collections[cIndex].items.filter((item) => item.id.toString() !== itemId);
	collections[cIndex].items = filteredItems;

	db.saveToDbFile();
	response.sendStatus(200);
});

module.exports = router;
