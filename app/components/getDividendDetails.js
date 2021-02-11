const api = require('../api.js');

module.exports = (subdomain) => {
  return new Promise(async (resolve, reject) => {
    const categories = (await api.fetch('get', 'categories', subdomain)).general_categories;
    resolve({categories});
  })
}