const detox = require('detox');
const config = require('../detox.config');

beforeAll(async () => {
  await detox.init(config);
}, 300000);

afterAll(async () => {
  await detox.cleanup();
});
