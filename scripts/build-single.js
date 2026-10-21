// Inlines style.css, questions.js and game.js into one self-contained file: dist/apple-a-day.html
// Usage: node scripts/build-single.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let html = read('index.html');
html = html.replace(/<!-- build:css -->[\s\S]*?<!-- \/build -->/, () => `<style>\n${read('style.css')}\n</style>`);
html = html.replace(/<!-- build:js -->[\s\S]*?<!-- \/build -->/, () => `<script>\n${read('questions.js')}\n</script>\n<script>\n${read('game.js')}\n</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'apple-a-day.html'), html);
console.log('Built dist/apple-a-day.html (' + Math.round(html.length / 1024) + ' KB)');
