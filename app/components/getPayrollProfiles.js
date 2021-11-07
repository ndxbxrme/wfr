const api = require('../api.js');

module.exports = (subdomain, dateFrom, dateTo, debug) => {
  return new Promise(async (resolve, reject) => {
    try {
      const query = dateTo.toISOString().split(/-/)[0];
      const url = 'payroll_profiles/' + query;
      const {profiles} = await api.fetch('get', url.replace(api.faUri, ''), subdomain, null, null, debug);
      console.log('profiles', profiles);
      console.log('PAYROLL PROFILES', profiles);
      resolve(profiles);
    } catch(e) {
      console.log('something went wrong and it was this', e);
      resolve([]);
    }
  })
}