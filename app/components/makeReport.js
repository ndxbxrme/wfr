const api = require('../api.js');
const {app} = require('electron');
const fs = require('fs-extra');
const path = require('path');
const outFile = path.join(app.getPath('desktop'), 'wfr-debug1.txt');

module.exports = (client, dateFrom, dateTo, debug) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {categories} = await require('./getDividendDetails.js')(client.subdomain, debug);
      const users = await require('./getUsers.js')(client.subdomain, debug);
      const payroll = await require('./getPayroll.js')(client.subdomain, dateFrom, dateTo, debug);

      const dividends = await require('./getDividends.js')(client.subdomain, dateFrom, dateTo, debug);
      users.forEach(user => {
        user.payroll = payroll.filter(payslip => payslip.user === user.url && new Date(payslip.dated_on) >= dateFrom && new Date(payslip.dated_on) <= dateTo);
        user.dividends = dividends.filter(dividend => new RegExp(user.first_name + ' ' + user.last_name + '$').test(dividend.name));
        user.dividends = user.dividends.reduce((res, dividend) => {
          [category] = categories.filter(category => category.url === dividend.category);
          console.log('CATEGORY', category.nominal_code);
          if(/^908/.test(category.nominal_code.toString())) {
            res[dividend.display_nominal_code] = res[dividend.display_nominal_code] || {
              nominal: dividend.display_nominal_code,
              user: user.url,
              name: user.first_name + ' ' + user.last_name,
              nino: user.ni_number,
              totalDividends: 0
            };
            res[dividend.display_nominal_code].totalDividends = res[dividend.display_nominal_code].totalDividends + +dividend.total;
          }
          return res;
        }, {});
        user.dividends = Object.keys(user.dividends).map(key => user.dividends[key]);
        console.log('user dividends', user.dividends);
        user.payroll = user.payroll.reduce((res, payslip) => {
          res.grossPay = res.grossPay + +payslip.basic_pay;
          res.taxPaid = res.taxPaid + +payslip.tax_deducted;
          res.studentLoanRepayment = res.studentLoanRepayment + +payslip.student_loan_deduction;
          res.postgradLoanRepayment = res.postgradLoanRepayment + +payslip.postgrad_loan_deduction;
          res.p45GrossPay = res.p45GrossPay + +user.current_payroll_profile.total_pay_in_previous_employment;
          res.p45TaxPaid = res.p45TaxPaid + +user.current_payroll_profile.total_tax_in_previous_employment;
          return res;
        }, {
          user: user.url,
          name: user.first_name + ' ' + user.last_name,
          nino: user.ni_number,
          grossPay: 0,
          taxPaid: 0,
          studentLoanRepayment: 0,
          postgradLoanRepayment: 0,
          p45GrossPay: 0,
          p45TaxPaid: 0
        });
      });
      resolve({
        id: client.id,
        name: client.name,
        crn: client.company_registration_number,
        subdomain: client.subdomain,
        dividends: users.reduce((res, user) => [...res, ...user.dividends], []).sort((a,b) => a.category > b.category ? 1 : -1),
        payroll: users.reduce((res, user) => [...res, user.payroll], [])
      });
    } catch(e) {
      console.log('FAILED', client.name, e.message);
      reject(e)
    }
  });
}