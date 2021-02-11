const api = require('../api.js');

module.exports = (subdomain, dateFrom, dateTo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const query = 'from_date=' + dateFrom.toISOString().split(/T/)[0] + '&to_date=' + dateTo.toISOString().split(/T/)[0];
      let dividends = [];
      let tb = {
        trial_balance_summary: [],
        next: 'accounting/trial_balance/summary?' + query
      };
      while(tb.next) {
        tb = await api.fetch('get', tb.next.replace(api.faUri, ''), subdomain);
        dividends = [...dividends, ...tb.trial_balance_summary];
      }
      resolve(dividends);
    } catch(e) {
      resolve([]);
    }
  })
}