/* eslint-disable linebreak-style */
/* eslint-disable no-console */
const dotenv = require('dotenv');
const app = require('./app');
const db = require('./storage/dbfile');

// Read environment varibale in .env (PORT, ...)
dotenv.config();

// From .env file
const { PORT } = process.env;

global.INVITATION_CODE = process.env.INVITATION_CODE;
global.MANDATORY_COLLECTION_PROPERTY = process.env.MANDATORY_COLLECTION_PROPERTY;

(async () => {
  // load dbFile content for populating the collections array
  await db.loadDbFile();
  await db.loadUsersFile();

  // listen for requests
  const listener = app.listen(PORT, () => {
    console.log(`App is listening on port ${listener.address().port}`);
  });
})();
