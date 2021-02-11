const api = require('../api.js');

module.exports = subdomain => {
  console.log('get users');
  return new Promise(async (resolve, reject) => {
    const {users} = await api.fetch('get', 'users', subdomain);
    resolve(users);
  });
}