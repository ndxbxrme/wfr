const api = require('../api.js');

module.exports = (subdomain, dateFrom, dateTo, debug) => {
  return new Promise(async (resolve, reject) => {
    let payslips = [];
    let date = dateFrom;
    let year = dateFrom.getFullYear();
    const endYear = dateTo.getFullYear();
    while(year <= endYear) {
      console.log('getting payroll', date);
      const {periods} = await api.fetch('get', 'payroll/' + year, subdomain, null, null, debug);
      for(let f=0; f<periods.length; f++) {
        const {period} = (await api.fetch('get', periods[f].url.replace(api.faUri, ''), subdomain));
        payslips = [...payslips, ...period.payslips];
      }
      year++;
    }
    resolve(payslips);
  });
};