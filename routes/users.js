/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* global INVITATION_CODE, registeredUsers */
const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Bring in Article model
// TODO introduire fonction qui stocke users dans un fichier texte
const db = require('../storage/dbfile');

// Register form
router.get('/register', (req, res) => {
  res.render('register');
});

// Register process
router.post('/register', [
  check('name', 'Name is required').isLength({ min: 1 }),
  check('email', 'Email is required').isLength({ min: 1 }),
  check('email', 'Email is not valid').isEmail(),
  check('username', 'Username is required').isLength({ min: 1 }),
  check('password', 'Password is required').isLength({ min: 1 }),
  check('invitation', 'Invitation code is required').isLength({ min: 1 }),
  check('password2', 'Please confirm password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords don't match");
    } else {
      return value;
    }
  }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('There were errors:', errors);
    // TODO améliorer le rendu des erreurs plutôt qu'utiliser un message générique
    res.render('register', {
      errors: {
        details: {
          msg: 'Please fill all the required fields',
        },
      },
    });
  } else {
    if (req.body.invitation !== INVITATION_CODE) {
      res.render('register', {
        errors: {
          details: {
            msg: 'Invalid invitation code',
          },
        },
      });
      return;
    }
    const newUser = {
      id: uuidv4(),
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
    };

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newUser.password, salt, (err2, hash) => {
        if (err) {
          console.log(err);
        }
        newUser.password = hash;
        try {
          registeredUsers.push(newUser);
          db.saveToUsersFile();
          req.flash('success', 'You are now registered and can log in');
          res.redirect('/users/login');
        } catch (e) {
          console.log(e);
        }
      });
    });
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

// Login process
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login',
    failureFlash: true,
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;
