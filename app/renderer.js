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
    const checkedIds = $$('.clients .client input[type=checkbox]:checked').map(box => box.id);
    $('.app').innerHTML = fill($('script#clients').innerText, {clients});
    $$('.clients .client input[type=checkbox]').forEach(box => box.checked = false);
    console.log('ids', checkedIds);
    checkedIds.forEach(id => $('#' + id) && ($('#' + id).checked = true));
    const noboxes = $$('.clients .client input[type=checkbox]').length;
    const nochecked = $$('.clients .client input[type=checkbox]:checked').length;
    $('.app input[type=checkbox]').checked = noboxes === nochecked;
  };
  const renderReport = report => {
    $('.app').innerHTML = fill($('script#report').innerText, report);
  }
  
  $('.app').innerHTML = fill($('script#fetching').innerText, {name:'Fetching clients'});
  $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_fetching'
  ipcRenderer.on('clients', (win, data) => {
    //refresh clients list
    console.log('got client data', data);
    clients = data;
    if(!clients.length) {
      $('.app').innerHTML = fill($('script#fetching').innerText, {name:'Fetching clients'});
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_fetching'
    }
    else {
      renderClients(data);
      $$('.clients .client input[type=checkbox]').forEach(box => box.checked = true);
      $('.app input[type=checkbox]').checked = true;
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
    refreshClients: () => {
      ipcRenderer.send('refreshClients');
      $('body').className = $('body').className.replace(/\s*page_\w+/g, '') + ' page_fetching';
    },
    makeReport: subdomain => {
      if(!$('#dateFrom').value || !$('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select a date range'});
        return;
      }
      if($('#dateFrom').value >= $('#dateTo').value) {
        ipcRenderer.send('error', {message: 'Please select valid a date range'});
        return;
      }
      const ids = $$('.clients .client input[type=checkbox]:checked').map(box => box.id.replace(/^c/, ''));
      if(!ids.length) {
        ipcRenderer.send('error', {message: 'Please select at least one client'});
        return;
      }
      ipcRenderer.send('makeReport', {
        dateFrom: $('#dateFrom').value,
        dateTo: $('#dateTo').value,
        ids: ids
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
    doSelect: (id, checked) => {
      if(id==='selectAll') {
        $$('.clients .client input[type=checkbox]').forEach(box => box.checked = checked);
      } else {
        const noboxes = $$('.clients .client input[type=checkbox]').length;
        const nochecked = $$('.clients .client input[type=checkbox]:checked').length;
        $('.app input[type=checkbox]').checked = noboxes === nochecked;
      }
    },
    
    
    
    
    search: (val) => {
      search = val;
      console.log(clients);
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