const api = require('../api.js');

module.exports = (subdomain, dateFrom, dateTo) => {
  return new Promise(async (resolve, reject) => {
    let payslips = [];
    let date = dateFrom;
    while(date <= dateTo) {
      const {periods} = await api.fetch('get', 'payroll/' + date.getFullYear(), subdomain);
      for(let f=0; f<periods.length; f++) {
        const {period} = (await api.fetch('get', periods[f].url.replace(api.faUri, ''), subdomain));
        payslips = [...payslips, ...period.payslips];
      }
      date = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    }
    resolve(payslips);
  });
};