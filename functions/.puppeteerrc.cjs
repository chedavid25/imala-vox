const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Indica a Puppeteer que descargue Chrome en la carpeta de la función
  // Esto asegura que el navegador viaje con el código a Google Cloud.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
