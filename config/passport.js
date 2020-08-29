/* eslint-disable linebreak-style */
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// TODO lint jquery, https://github.com/jquery/eslint-config-jquery
module.exports = function (passport) {
  // Local Strategy
  passport.use(new LocalStrategy(function(username, password, done){
    // Match username
    var found = 0;
    registeredUsers.forEach(user => {
      if (user.username == username) {
        found = 1;

        // match password
        bcrypt.compare(password, user.password, function(err, isMatch){
          if (err) throw err;
          if(isMatch){
            return done(null, user);
          }
          else {
            return done(null, false, {message: 'Invalid credentials'});
          }
        });
      }
    });
    if(!found) {
      return done(null, false, {message: 'Invalid credentials'});
    }
  }));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    var found = 0;
    registeredUsers.forEach(user => {
      if (user.id == id) {
        found = 1;
        done(null, user);
      }
    });
    if(!found) {
      done(null, false, {message: 'Invalid credentials'});
    }
  });
}