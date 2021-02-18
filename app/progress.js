const {ipcRenderer} = require('electron');

const App = () => {
  return {
    cancel: () => ipcRenderer.send('cancel')
  }
};
window.app = App();

ipcRenderer.on('updateProgress', (win, data) => {
  document.querySelector('.progress-bar').style.width = data.percent + '%';
  document.querySelector('.progress .text').innerText = data.text;
  document.querySelector('.progress .ptext').innerText = data.ptext;
});