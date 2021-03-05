window.onload = () => {
  const filtered = Array.from(document.querySelectorAll('form')).filter(elm => /account_manager/.test(elm.id));
  filtered.forEach(form => {
    form.setAttribute('onclick', 'this.submit()');
  })
}