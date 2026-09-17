const fs = require('fs');
const path = require('path');

const d = 'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src';

function fixGridInFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  const newCode = code.replace(/<Grid item\s+([^>]+)>/g, (match, attrs) => {
    count++;
    const sizeObj = {};
    // Match simple: xs={12}, sm={6}, md={4}
    const re = /(\w+)=\{(\d+(?:\.\d+)?)\}/g;
    let m;
    while ((m = re.exec(attrs)) !== null) {
      sizeObj[m[1]] = m[2].includes('.') ? parseFloat(m[2]) : parseInt(m[2]);
    }
    // Match expressions: md={tab === 'all' ? 6 : 12}
    const exprRe = /(\w+)=\{([^}]+)\}/g;
    let em;
    while ((em = exprRe.exec(attrs)) !== null) {
      if (!sizeObj[em[1]]) {
        sizeObj[em[1]] = em[2];
      }
    }
    const inner = Object.entries(sizeObj).map(([k, v]) => {
      return k + ': ' + (typeof v === 'string' ? v : v);
    }).join(', ');
    return '<Grid size={{ ' + inner + ' }}>';
  });
  if (count > 0) {
    fs.writeFileSync(filePath, newCode);
    console.log(path.basename(filePath) + ': fixed ' + count);
  }
  return count;
}

let total = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      walk(fp);
    } else if (f.endsWith('.jsx') || f.endsWith('.tsx')) {
      total += fixGridInFile(fp);
    }
  }
}

walk(d);
console.log('\nTotal: ' + total + ' Grid items fixed');
