const {app, BrowserWindow, session, ipcMain, Menu} = require('electron');
const {autoUpdater} = require('electron-updater');
const url = require('url');
const path = require('path');
const fs = require('fs-extra');
const api = require('./api.js');
const getLocal = require('./components/getLocal.js');
const saveLocal = require('./components/saveLocal.js');

let mainWindow = null;
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
    getClients();
  }
  //mainWindow.openDevTools();
};
const getClients = async () => {
  let clients = (await getLocal('clients')) || [];
  mainWindow.send('clients', clients);
  clients = await require('./components/getClients.js');
  saveLocal('clients', clients);
  mainWindow.send('clients', clients);
};
ipcMain.on('makeReport', async (win, data) => {
  mainWindow.send('report', await require('./components/makeReport.js')(data.client, new Date(data.dateFrom), new Date(data.dateTo)));
});
app.on('ready', ready);
app.on('window-all-closed', () => process.platform==='darwin' || app.quit());
app.on('activate', () => mainWindow || ready());