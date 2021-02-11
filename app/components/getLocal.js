const {app} = require('electron');
const fs = require('fs-extra');
const path = require('path');

module.exports = async (name, data) => {
  const uri = path.join(app.getPath('userData'), name + '.json');
  if(!(await fs.exists(uri))) return null;
  return JSON.parse((await fs.readFile(uri, 'utf8') || null));
}