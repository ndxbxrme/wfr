const api = require('../api.js');
const dec = require('decimalmath');

module.exports = (client, dateFrom, dateTo) => {
  return new Promise(async (resolve, reject) => {
    const {categories} = await require('./getDividendDetails.js')(client.subdomain);
    const users = await require('./getUsers.js')(client.subdomain);
    const payroll = await require('./getPayroll.js')(client.subdomain, dateFrom, dateTo);
    const dividends = await require('./getDividends.js')(client.subdomain, dateFrom, dateTo);
    users.forEach(user => {
      user.payroll = payroll.filter(payslip => payslip.user === user.url && new Date(payslip.dated_on) >= dateFrom && new Date(payslip.dated_on) <= dateTo);
      user.dividends = dividends.filter(dividend => new RegExp(user.first_name + ' ' + user.last_name + '$').test(dividend.name));
      user.dividends = user.dividends.reduce((res, dividend) => {
        [category] = categories.filter(category => category.url === dividend.category);
        res[dividend.category] = res[dividend.category] || {
          nominal: category.nominal_code,
          user: user.url,
          name: user.first_name + ' ' + user.last_name,
          nino: user.ni_number,
          totalDividends: 0
        }
        res[dividend.category].totalDividends = dec.add(res[dividend.category].totalDividends, +dividend.total);
        return res;
      }, {});
      user.dividends = Object.keys(user.dividends).map(key => user.dividends[key]);
      user.payroll = user.payroll.reduce((res, payslip) => {
        res.grossPay = dec.add(res.grossPay, +payslip.basic_pay);
        res.taxPaid = dec.add(res.taxPaid, +payslip.tax_deducted);
        res.studentLoanRepayment = dec.add(res.studentLoanRepayment, +payslip.student_loan_deduction);
        res.postgradLoanRepayment = dec.add(res.postgradLoanRepayment, +payslip.postgrad_loan_deduction);
        res.p45GrossPay = dec.add(res.p45GrossPay, +user.current_payroll_profile.total_pay_in_previous_employment);
        res.p45TaxPaid = dec.add(res.p45TaxPaid, +user.current_payroll_profile.total_tax_in_previous_employment);
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
  });
}