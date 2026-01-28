const fs = require('fs');
const path = require('path');

const correctPaths = [
    {
        dir: 'e:\\lumina-editor\\effects\\library',
        find: "from '../models'",
        replace: "from '../../models'"
    },
    {
        dir: 'e:\\lumina-editor\\transitions\\library',
        find: "from '../models'",
        replace: "from '../../models'"
    },
    {
        file: 'e:\\lumina-editor\\transitions\\registry.ts',
        find: "from './models'",
        replace: "from '../models'"
    },
    {
        file: 'e:\\lumina-editor\\effects\\registry.ts',
        find: "from './models'",
        replace: "from '../models'"
    },
    // Add more if needed
];

correctPaths.forEach(task => {
    if (task.dir) {
        if (fs.existsSync(task.dir)) {
            fs.readdirSync(task.dir).forEach(f => {
                if (!f.endsWith('.ts') && !f.endsWith('.tsx')) return;
                const fp = path.join(task.dir, f);
                let content = fs.readFileSync(fp, 'utf8');
                if (content.includes(task.find)) {
                    console.log(`Fixing ${fp}`);
                    content = content.replace(task.find, task.replace);
                    fs.writeFileSync(fp, content, 'utf8');
                }
            });
        }
    } else if (task.file) {
        if (fs.existsSync(task.file)) {
             let content = fs.readFileSync(task.file, 'utf8');
             if (content.includes(task.find)) {
                 console.log(`Fixing ${task.file}`);
                 content = content.replace(task.find, task.replace);
                 fs.writeFileSync(task.file, content, 'utf8');
             }
        }
    }
});
