/* eslint-disable linebreak-style */
const request = require('supertest');
const app = require('../app');

// check paths /xxx
describe('Test the root path', () => {
  it('should get a 200 response on "/"', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toEqual(200);
  });
});

const reserverdUrls = ['collections', 'writeCollection', 'export'];
reserverdUrls.forEach((url) => {
  describe(`Test the ${url} path`, () => {
    it(`should get a 302 response on "${url}"`, async () => {
      const response = await request(app).get(`/${url}`);
      expect(response.statusCode).toEqual(302);
    });
  });
});

const urls404 = ['change', 'add', 'show', 'showStatic', 'edit', 'modify'];
urls404.forEach((url) => {
  describe(`Test the ${url} path`, () => {
    it(`should get a 404 response on "${url}"`, async () => {
      const response = await request(app).get(`/${url}`);
      expect(response.statusCode).toEqual(404);
    });
  });
});
