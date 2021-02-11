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
    renderClients(data);
  });
  ipcRenderer.on('report', (win, data) => {
    renderReport(data);
  });
  $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_clients';
  return {
    $,
    fill,
    currency: (num) => '&pound' + (+num).toFixed(2),
    makeReport: subdomain => {
      if(!$('#dateFrom').value || !$('#dateTo').value) return;
      if($('#dateFrom').value >= $('#dateTo').value) return;
      const [client] = clients.filter(client => client.subdomain === subdomain);
      ipcRenderer.send('makeReport', {
        client,
        dateFrom: $('#dateFrom').value,
        dateTo: $('#dateTo').value
      });
      $('.app').innerHTML = fill($('script#loading').innerText, client);
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_report'
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