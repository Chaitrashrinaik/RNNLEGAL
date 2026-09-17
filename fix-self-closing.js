const fs = require('fs');
const path = require('path');

const d = 'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src';

function fixSelfClosingGrids(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  
  // Pattern: <Grid size={{ ... }}>\n</Grid>  (empty self-closing that got broken)
  // Replace with: <Grid size={{ ... }} />
  code = code.replace(/<Grid (size=\{\{[^}]+\}\})>\s*\n\s*<\/Grid>/g, '<Grid $1 />');
  
  if (code !== original) {
    fs.writeFileSync(filePath, code);
    const fixed = (original.match(/<Grid/g) || []).length - (code.match(/<Grid/g) || []).length;
    console.log(path.basename(filePath) + ': fixed empty self-closing (' + fixed + ' collapsed)');
    return true;
  }
  return false;
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp);
    else if (f.endsWith('.jsx') || f.endsWith('.tsx')) {
      fixSelfClosingGrids(fp);
    }
  }
}

walk(d);
console.log('Done - empty self-closing Grid tags fixed');
