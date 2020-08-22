// server.js
// where the node app starts

const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const { check, validationResult } = require('express-validator');
const helmet = require('helmet');
const passport = require('passport');

let coll = require('./routes/collections');
let users = require('./routes/users');
const db = require('./storage/dbfile');
const text = require('./lang/text');

// Read environment varibale in .env (PORT, ...)
dotenv.config();

// From .env file
const PORT = process.env.PORT;

global.INVITATION_CODE = process.env.INVITATION_CODE;
global.MANDATORY_COLLECTION_PROPERTY = process.env.MANDATORY_COLLECTION_PROPERTY;

global.collections = [];
global.registeredUsers = [];

// load dbFile content for populating the collections array
db.loadDbFile();
db.loadUsersFile();

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

// Passport config
require('./config/passport')(passport);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
});

app.use('/', coll);
app.use('/users', users);

app.use(function(req, res, next) {
	res.status(404).render('404');
});

// listen for requests
var listener = app.listen(PORT, () => {
	console.log('App is listening on port ' + listener.address().port);
});

