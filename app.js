/* eslint-disable linebreak-style */
/* eslint-disable indent */
/* eslint-disable no-tabs */
/* eslint-disable no-console */
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const helmet = require('helmet');
const passport = require('passport');
const expressMessages = require('express-messages');

const coll = require('./routes/collections');
const users = require('./routes/users');

global.collections = [];
global.registeredUsers = [];

const app = express();

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
  saveUninitialized: true,
}));

// messages middleware
app.use(require('connect-flash')());

app.use((req, res, next) => {
  res.locals.messages = expressMessages(req, res);
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

app.get('*', (req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.post('*', (req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.use('/', coll);
app.use('/users', users);

app.use((req, res) => {
	res.status(404).render('404');
});

module.exports = app;
