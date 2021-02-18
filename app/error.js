const {ipcRenderer} = require('electron');
ipcRenderer.on('error', (win, data) => {
  document.querySelector('.message').innerText = data.message;
});