const {app, BrowserWindow, session, ipcMain, Menu, dialog, Notification} = require('electron');
//const {autoUpdater} = require('electron-updater');
const url = require('url');
const path = require('path');
const fs = require('fs-extra');
const api = require('./api.js');
const getLocal = require('./components/getLocal.js');
const saveLocal = require('./components/saveLocal.js');

let clients = [];
let mainWindow = null;
let progressWindow = null;
let errorWindow = null;
let shouldClearClients = false;
let settings = {
  width: 700,
  height: 500
};
api.setTokenHanlder((token) => {
  settings.token = token;
  saveLocal('settings', settings);
})
const ready = async () => {
  //autoUpdater.checkForUpdatesAndNotify();
  const applicationMenu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(applicationMenu);
  let mysettings = await getLocal('settings');
  mysettings = mysettings || {};
  if(mysettings.version!=='2') {
    mysettings = settings;
    settings.version = '2';
    saveLocal('settings', settings);
    shouldClearClients = true;
  }
  settings = mysettings || settings;
  api.setCode(settings.code);
  api.setToken(settings.token);
  settings.webPreferences = {nodeIntegration: true, enableRemoteModule:true, preload: path.join(__dirname, 'preload.js')};
  mainWindow = new BrowserWindow(settings);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*.freeagent.com/*']}, (details, cb) => {
    const code = (details.url.match(/\/\?code=(.*?)&/) || [])[1];
    //console.log('free', details.url);
    if(code) {
      console.log('got code', code);
      api.setCode(code);
      api.setToken(null);
      settings.code = code;
      saveLocal('settings', settings);
      mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
      }));
      getClients();
    }
    cb({cancel:false});
  });
  mainWindow.on('close', () => {
    settings = Object.assign(settings, mainWindow.getBounds());
    saveLocal('settings', settings);
  });
  mainWindow.on('closed', () => mainWindow = null);
  if(!settings.code) {
    mainWindow.loadURL('https://login.freeagent.com/login?extra_login_params%5Bafter_login_path%5D=%2Fapp_approvals%2Fnew%3Fclient_id%3DoIyo3GJiJ_NdmxSUzdrlHw%26redirect_uri%3Dhttps%253A%252F%252Fapi.freeagent.com%26response_type%3Dcode%26state%3Dxyz&extra_login_params%5Blogin_prompt%5D=app_approval');
  }
  else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
    mainWindow.send('clients', clients);
    mainWindow.once('ready-to-show', getClients);
  }
  //mainWindow.openDevTools();
};
const getClients = async () => {
  clients = (await getLocal('clients')) || [];
  if(shouldClearClients) clients = [];
  mainWindow.send('clients', clients);
  if(!clients.length) {
    getRemoteClients();
  }
};
const getRemoteClients = async () => {
  clients = [];
  mainWindow.send('clients', clients);
  clients = await require('./components/getClients.js');
  clients.sort((a, b) => a.name > b.name ? 1 : -1);
  saveLocal('clients', clients);
  mainWindow.send('clients', clients);
};
const debug = function() {
  //mainWindow.webContents.send('debug', Array.from(arguments).join(' '));
}
ipcMain.on('refreshClients', getRemoteClients);
ipcMain.on('makeReport', async (win, data) => {
  processing = true;
  progressWindow = new BrowserWindow({
    width: 370,
    height: 70,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  progressWindow.loadURL(url.format({pathname: path.join(__dirname, 'progress.html'),protocol:'file:',slashes:true}));
  progressWindow.once('ready-to-show', async () => {
    progressWindow.show()
    const errorReport = [];
    const filteredClients = clients.filter(client => data.ids.includes(client.subdomain));
    const report = [];
    for(let c=0; c<filteredClients.length; c++) {
      if(!processing) return;
      try {
        progressWindow.webContents.send('updateProgress', {text:filteredClients[c].name, ptext: (c + 1) + '/' + filteredClients.length, percent: (c + 1) / filteredClients.length * 100});
        report.push(await require('./components/makeReport.js')(filteredClients[c], new Date(data.dateFrom), new Date(data.dateTo), debug));
      } catch(e) {
        errorReport.push({client:filteredClients[c],message:e.message});
        //dialog.showErrorBox('Error', e.stack);
      }
    }
    //console.log('report', report);
    const finalReport = report.reduce((res, client) => {
      const clientData = [client.id, client.subdomain, client.crn, client.name];
      client.payroll.forEach(payroll => {
        const payrollData = [+payroll.user.match(/\d+$/)[0], payroll.name, payroll.nino, payroll.grossPay, payroll.taxPaid, payroll.studentLoanRepayment, payroll.postgradLoanRepayment, payroll.p45GrossPay, payroll.p45TaxPaid];
        const dividend = client.dividends.filter(dividend => dividend.name === payroll.name)[0] || {user:'0'};
        const dividendData = [dividend.nominal || 0, +dividend.user.match(/\d+$/)[0], dividend.name || '', dividend.nino || '', dividend.totalDividends || 0];
        res.push([...clientData, ...dividendData, ...payrollData]);//not checking for values
        /*
        if(dividend.totalDividends || payroll.grossPay || payroll.taxPaid || payroll.studentLoanRepayment || payroll.postgradLoanRepayment || payroll.p45GrossPay || payroll.p45TaxPaid) 
          res.push([...clientData, ...dividendData, ...payrollData]);
        else
          errorReport.push({client,user:payroll,message:'Zero dividend and payroll'});
        */
      })
      return res;
    }, []);
    console.log('final report', finalReport);
    finalReport.unshift(['Company.ID', 'Company.Subdomain', 'Company.CRN', 'Company.CompanyName', 'Shareholder.Nominal', 'Shareholder.User', 'Shareholder.Name', 'Shareholder.NiNo', 'Shareholder.TotalDividends', 'Payroll.User', 'Payroll.Name', 'Payroll.NiNo', 'Payroll.GrossPay', 'Payroll.TaxPaid', 'Payroll.StudentLoanRepayment', 'Payroll.PostgradLoanRepayment', 'Payroll.P45GrossPay', 'Payroll.P45TaxPaid']);
    const csv = finalReport.map(row => JSON.stringify(row).replace(/^\[|\]$/g, '')).join('\r\n');

    mainWindow.webContents.send('endProcessing');
    progressWindow.close();
    processing = false;
    if(errorReport.length) {
      const errorReportWindow = new BrowserWindow({
        width: 500,
        height: 400,
        webPreferences: {
          nodeIntegration: true
        }
      });
      //errorReportWindow.openDevTools();
      try {
        await new Promise((resolve, reject) => {
          errorReportWindow.loadURL(url.format({pathname: path.join(__dirname, 'error-report.html'),protocol:'file:',slashes:true}));
          errorReportWindow.once('ready-to-show', () => errorReportWindow.webContents.send('errorReport', errorReport));
          ipcMain.on('errorReportOk', () => resolve());
          ipcMain.on('errorReportCancel', () => {console.log('cancelled');reject()});
        });
        errorReportWindow.close();
      } catch (e) {
        errorReportWindow.close();
        return;
      }
    }
    let filePath = dialog.showSaveDialogSync({
      defaultPath: 'freeagent-report_' + data.dateFrom + '_' + data.dateTo + '.csv',
      buttonLabel: 'Save Report',
      filters: [
        {name: 'CSV', extensions: ['csv']}
      ]
    });
    if(filePath) {
      await fs.writeFile(filePath, csv, 'utf-8');
      new Notification({title:'Worker Freeagent Report', body:'File Saved'}).show();
    }
  });

});
ipcMain.on('singleReport', async (win, data) => {
  mainWindow.send('report', await require('./components/makeReport.js')(data.client, new Date(data.dateFrom), new Date(data.dateTo), debug));
})
ipcMain.on('cancel', () => {
  processing = false;
  progressWindow.close();
  mainWindow.webContents.send('cancel');
});
ipcMain.on('error', (win, data) => {
  dialog.showErrorBox(data.title || 'Error', data.message);
  
});
ipcMain.on('logout', () => {
  delete settings.code;
  delete settings.token;
  saveLocal('settings', settings);
  clients = [];
  saveLocal('clients', clients);
  app.exit();
});
app.on('ready', ready);
app.on('window-all-closed', () => process.platform==='darwin' || app.quit());
app.on('activate', () => mainWindow || ready());