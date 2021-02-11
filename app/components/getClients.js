const api = require('../api.js');

module.exports = new Promise(async (resolve, reject) => {
  const fetchUrl = 'clients?view=all&per_page=100';
  let clients = [];
  let response = (await api.fetch('get', fetchUrl));
  while(response.next) {
    clients = [...clients, ...response.clients];
    response = (await api.fetch('get', fetchUrl));
  }
  clients = [...clients, ...response.clients];
  resolve(clients.map(client => {
    return {
      id: client.id,
      name: client.name,
      subdomain: client.subdomain,
      company_registration_number: client.company_registration_number
    }
  }));
})