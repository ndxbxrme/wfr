const {ipcRenderer} = require('electron');

const App = () => {
  let clients = [];
  let search = '';
  const $ = (selector, elem) => (elem || document).querySelector(selector);
  const $$ = (selector, elem) => Array.from((elem || document).querySelectorAll(selector));
  const fill = (template, data) => template.replace(/\{\{(.+?)\}\}/g, (all, str) => {
    try { return (new Function("with(this) {return " + str + "}")).call(data); 
    } catch(e) { return ''; } 
  });
  const renderClients = clients => {
    $('.app').innerHTML = fill($('script#clients').innerText, {clients});
  };
  const renderReport = report => {
    $('.app').innerHTML = fill($('script#report').innerText, report);
  }
  ipcRenderer.on('clients', (win, data) => {
    //refresh clients list
    clients = data;
    if(!clients.length) {
      $('.app').innerHTML = fill($('script#fetching').innerText, {name:'Fetching clients'});
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_fetching'
    }
    else {
      renderClients(data);
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_clients'
    }
  });
  ipcRenderer.on('report', (win, data) => {
    renderReport(data);
  });
  ipcRenderer.on('debug', (win, data) => {
    $('.debug').innerText += data + '\n';
  });
  $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_fetching';
  return {
    $,
    fill,
    currency: (num) => '&pound' + (+num).toFixed(2),
    makeReport: subdomain => {
      if(!$('#dateFrom').value || !$('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select a date range'});
        return;
      }
      if($('#dateFrom').value >= $('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select valid a date range'});
        return;
      }
      ipcRenderer.send('makeReport', {
        dateFrom: $('#dateFrom').value,
        dateTo: $('#dateTo').value
      });
      //$('.app').innerHTML = fill($('script#loading').innerText, client);
      //$('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_report'
    },
    singleReport: subdomain => {
      if(!$('#dateFrom').value || !$('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select a date range'});
        return;
      }
      if($('#dateFrom').value >= $('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select a valid date range'});
        return;
      }
      const [client] = clients.filter(client => client.subdomain === subdomain);
      ipcRenderer.send('singleReport', {
        client,
        dateFrom: $('#dateFrom').value,
        dateTo: $('#dateTo').value
      });
      $('.app').innerHTML = fill($('script#loading').innerText, client);
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_report'
    },
    logout: () => {
      ipcRenderer.send('logout');
    },
    
    
    
    
    search: (val) => {
      search = val;
      renderClients(clients);
    },
    getSearch: () => search,
    gotoClients: () => {
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_clients';
      renderClients(clients)
    }
  }
};
window.app = App();