const {app} = require('electron');
const fs = require('fs-extra');
const path = require('path');

module.exports = async (name, data) => {
  return await fs.writeFile(path.join(app.getPath('userData'), name + '.json'), JSON.stringify(data), 'utf8');
}