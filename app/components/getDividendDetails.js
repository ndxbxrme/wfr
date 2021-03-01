const api = require('../api.js');

module.exports = (subdomain, debug) => {
  return new Promise(async (resolve, reject) => {
    const categories = (await api.fetch('get', 'categories', subdomain, null, null, debug)).general_categories;
    resolve({categories});
  })
}