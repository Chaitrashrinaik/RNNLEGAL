const fs = require('fs');
const files = [
  'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src/pages/cases/CaseDetail.jsx',
  'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src/pages/cases/CaseForm.jsx',
];
for (const f of files) {
  let code = fs.readFileSync(f, 'utf8');
  let count = 0;
  let newCode = code.replace(/<Grid item\s+([^>]+)>/g, (match, attrs) => {
    count++;
    // Parse xs={12} sm={6} etc
    const sizeObj = {};
    const re = /(\w+)=\{(\d+)\}/g;
    let m;
    while ((m = re.exec(attrs)) !== null) {
      sizeObj[m[1]] = parseInt(m[2]);
    }
    const inner = Object.entries(sizeObj).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `<Grid size={{ ${inner} }}>`;
  });
  if (count > 0) {
    fs.writeFileSync(f, newCode);
    console.log(f.split('/').pop() + ': fixed ' + count);
  } else {
    console.log(f.split('/').pop() + ': no changes');
  }
}
