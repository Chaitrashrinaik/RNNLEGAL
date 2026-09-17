const fs = require('fs');
const d = 'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src';
const file = d + '/pages/Dashboard.jsx';
let code = fs.readFileSync(file, 'utf8');
let count = 0;
let newCode = code.replace(/<Grid item\s+([^>]+)>/g, (match, attrs) => {
  count++;
  const sizeObj = {};
  const re = /(\w+)=\{(\d+)\}/g;
  let m;
  while ((m = re.exec(attrs)) !== null) {
    sizeObj[m[1]] = parseInt(m[2]);
  }
  const inner = Object.entries(sizeObj).map(([k, v]) => k + ': ' + v).join(', ');
  return '<Grid size={{ ' + inner + ' }}>';
});
if (count > 0) {
  fs.writeFileSync(file, newCode);
  console.log('Dashboard.jsx: fixed ' + count);
} else {
  console.log('Dashboard.jsx: no changes');
}
