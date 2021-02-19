const {app, BrowserWindow, session, ipcMain, Menu, dialog, Notification} = require('electron');
const {autoUpdater} = require('electron-updater');
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
let settings = {
  width: 700,
  height: 500
};
api.setTokenHanlder((token) => {
  settings.token = token;
  saveLocal('settings', settings);
})
const ready = async () => {
  autoUpdater.checkForUpdatesAndNotify();
  const applicationMenu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(applicationMenu);
  settings = (await getLocal('settings')) || settings;
  api.setCode(settings.code);
  api.setToken(settings.token);
  settings.webPreferences = {nodeIntegration: true};
  mainWindow = new BrowserWindow(settings);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*.freeagent.com/*']}, (details, cb) => {
    const code = (details.url.match(/\/\?code=(.*?)&/) || [])[1];
    if(code) {
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
    mainWindow.loadURL('https://login.sandbox.freeagent.com/login?extra_login_params%5Bafter_login_path%5D=%2Fapp_approvals%2Fnew%3Fclient_id%3DyMCbudV-5I5RIuArSOa_7w%26redirect_uri%3Dhttps%253A%252F%252Fapi.sandbox.freeagent.com%26response_type%3Dcode%26state%3Dxyz&extra_login_params%5Blogin_prompt%5D=app_approval');
  }
  else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
    mainWindow.once('ready-to-show', getClients);
  }
  //mainWindow.openDevTools();
};
const getClients = async () => {
  clients = (await getLocal('clients')) || [];
  mainWindow.send('clients', clients);
  clients = await require('./components/getClients.js');
  saveLocal('clients', clients);
  mainWindow.send('clients', clients);
};
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
  
    const report = [];
    for(let c=0; c<clients.length; c++) {
      if(!processing) return;
      try {
        progressWindow.webContents.send('updateProgress', {text:clients[c].name, ptext: (c + 1) + '/' + clients.length, percent: (c + 1) / clients.length * 100});
        report.push(await require('./components/makeReport.js')(clients[c], new Date(data.dateFrom), new Date(data.dateTo)));
      } catch(e) {
        dialog.showErrorBox('Error', e.message);
      }
    }
    const finalReport = report.reduce((res, client) => {
      const clientData = [client.id, client.subdomain, client.crn, client.name];
      client.payroll.forEach(payroll => {
        const payrollData = [+payroll.user.match(/\d+$/)[0], payroll.name, payroll.nino, payroll.grossPay, payroll.taxPaid, payroll.studentLoanRepayment, payroll.postgradLoanRepayment, payroll.p45GrossPay, payroll.p45TaxPaid];
        const userDividends = client.dividends.filter(dividend => dividend.name === payroll.name);
        userDividends.forEach(dividend => {
          const dividendData = [dividend.nominal, +dividend.user.match(/\d+$/)[0], dividend.name, dividend.nino, dividend.totalDividends];
          res.push([...clientData, ...dividendData, ...payrollData]);
        })
      })
      return res;
    }, []);
    finalReport.unshift(['Company.ID', 'Company.Subdomain', 'Company.CRN', 'Company.CompanyName', 'Shareholder.Nominal', 'Shareholder.User', 'Shareholder.Name', 'Shareholder.NiNo', 'Shareholder.TotalDividends', 'Payroll.User', 'Payroll.Name', 'Payroll.NiNo', 'Payroll.GrossPay', 'Payroll.TaxPaid', 'Payroll.StudentLoanRepayment', 'Payroll.PostgradLoanRepayment', 'Payroll.P45GrossPay', 'Payroll.P45TaxPaid']);
    const csv = finalReport.map(row => JSON.stringify(row).replace(/^\[|\]$/g, '')).join('\r\n');

    mainWindow.webContents.send('endProcessing');
    progressWindow.close();
    processing = false;
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
  mainWindow.send('report', await require('./components/makeReport.js')(data.client, new Date(data.dateFrom), new Date(data.dateTo)));
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
  app.exit();
});
app.on('ready', ready);
app.on('window-all-closed', () => process.platform==='darwin' || app.quit());
app.on('activate', () => mainWindow || ready());