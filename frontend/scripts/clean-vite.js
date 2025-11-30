const fs = require('fs');
const path = require('path');

const viteCacheDir = path.join(__dirname, '..', 'node_modules', '.vite');
const viteCacheDir2 = path.join(__dirname, '..', '.vite-cache');

// Intentar eliminar carpetas de caché de Vite
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    try {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
      console.log(`✓ Eliminada: ${folderPath}`);
    } catch (error) {
      console.log(`⚠ No se pudo eliminar: ${folderPath} (puede estar en uso)`);
    }
  }
}

console.log('Limpiando caché de Vite...');
deleteFolderRecursive(viteCacheDir);
deleteFolderRecursive(viteCacheDir2);
console.log('Listo! Puedes ejecutar npm run dev ahora.');

