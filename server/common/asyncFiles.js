const fs = require('fs');

module.exports = {
  readdirAsync: function (path) {
    return new Promise(function (resolve, reject) {
      fs.readdir(path, function (error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  },

  readFileAsync: function (path, opts = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.readFile(path, opts, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(data));
          }
      });
    });
  }
}