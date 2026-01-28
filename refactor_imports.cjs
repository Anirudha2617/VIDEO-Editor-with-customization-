const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && !dirPath.includes('node_modules') && !dirPath.includes('.git') && !dirPath.includes('dist')) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

walkDir('e:\\lumina-editor', (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    if (filePath.endsWith('types.ts')) return; // Don't edit the file we are deleting
    if (filePath.includes('refactor_imports.js')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace ../types or ./types or ../../types with models
    // Regex: from\s+['"](\.{1,2}\/)+types['"]
    
    // Pattern 1: from './types' -> from './models'
    content = content.replace(/from\s+['"]\.\/types['"]/g, "from './models'");
    
    // Pattern 2: from '../types' -> from '../models'
    content = content.replace(/from\s+['"]\.\.\/types['"]/g, "from '../models'");

    // Pattern 3: from '../../types' -> from '../../models'
    content = content.replace(/from\s+['"]\.\.\/\.\.\/types['"]/g, "from '../../models'");
    
    // Pattern 4: from '../../../types' -> from '../../../models'
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/types['"]/g, "from '../../../models'");

    if (content !== original) {
        console.log(`Updating ${filePath}`);
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
