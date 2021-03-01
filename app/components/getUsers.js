const api = require('../api.js');

module.exports = (subdomain, debug) => {
  return new Promise(async (resolve, reject) => {
    const {users} = await api.fetch('get', 'users', subdomain, null, null, debug);
    resolve(users);
  });
}