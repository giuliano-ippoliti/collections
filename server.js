// server.js
// where the node app starts

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');
const helmet = require('helmet');

let coll = require('./routes/collections');
const db = require('./storage/dbfile');

var app = express();

app.use(helmet());

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

global.SECRET = process.env.SECRET;

global.collections = [];
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

// Loading items from Db file at startup
// TODO: Try catch
var exists = fs.existsSync(db.dbFile);
if (exists) {
	console.log('Database file is ready to go!');

	// read db file for storage in items
	// TODO: Try catch
	// TODO: async ?
	var contents = fs.readFileSync(db.dbFile);

	// load items to items array
	collections = JSON.parse(contents);
}

app.use('/', coll);

// listen for requests
var listener = app.listen(PORT, () => {
	console.log('App is listening on port ' + listener.address().port);
});

