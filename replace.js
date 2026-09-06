const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const ignoreDirs = ['node_modules', '.git', 'dist', '.next', 'build', '.expo', 'out', 'k8s', '.github', 'venv', '.turbo', 'typechain-types', 'artifacts', 'cache'];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      if (!fullPath.endsWith('.png') && !fullPath.endsWith('.jpg') && !fullPath.endsWith('.jpeg') && !fullPath.endsWith('.ico') && !fullPath.endsWith('.pyd') && !fullPath.endsWith('.pem') && file !== 'replace.js' && file !== 'package-lock.json') {
        processFile(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    newContent = newContent.replace(/Kenyan Healthcare Token/gi, 'AfyaToken');
    newContent = newContent.replace(/Kenya Health Token/gi, 'AfyaToken');
    newContent = newContent.replace(/KHT/g, 'AfyaToken');
    newContent = newContent.replace(/kht/g, 'afyaToken');
    newContent = newContent.replace(/Kht/g, 'AfyaToken');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Modified: ${filePath}`);
    }
  } catch (err) {
    // Ignore read errors
  }
}

processDirectory(rootDir);
console.log('Content replacement complete.');

function renameFiles(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        renameFiles(fullPath);
      }
    }

    let newFile = file;
    if (file.includes('KHT')) {
      newFile = file.replace(/KHT/g, 'AfyaToken');
    } else if (file.includes('kht')) {
      newFile = file.replace(/kht/g, 'afyaToken');
    }

    if (newFile !== file) {
      const newFullPath = path.join(directory, newFile);
      fs.renameSync(fullPath, newFullPath);
      console.log(`Renamed: ${fullPath} -> ${newFullPath}`);
    }
  }
}

renameFiles(rootDir);
console.log('File renaming complete.');
