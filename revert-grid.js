const fs = require('fs');
const path = require('path');
const d = 'C:/Users/BS-24/Documents/Default Project/case-management-system/client/src';

function revertGrid(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  
  // Revert: <Grid size={{ xs: 12, sm: 6 }}> -> <Grid item xs={12} sm={6}>
  // Also handle: <Grid size={{ xs: 12, sm: 6 }} sx={...}> -> <Grid item xs={12} sm={6} sx={...}>
  // Also handle: <Grid size={12}> -> <Grid item xs={12}>
  code = code.replace(/<Grid size=\{\{\s*((?:\w+:\s*\d+(?:\.\d+)?(?:\s*,\s*)?)+)\s*\}\}(\s*(?:\/|sx=\{[^}]*\}[^>]*)?)>/g, (match, propsStr, trailing) => {
    const parts = propsStr.split(',').map(p => p.trim()).filter(Boolean);
    const gridProps = parts.map(p => {
      const [key, val] = p.split(':').map(s => s.trim());
      return key + '={' + val + '}';
    }).join(' ');
    return '<Grid item ' + gridProps + (trailing || '') + '>';
  });
  
  // Also revert: <Grid size={{ xs: 12, md: 6, sx: { textAlign: { md: 'right' } }}> -> already fixed, skip
  // Handle <Grid size={12}> -> <Grid item xs={12}>
  code = code.replace(/<Grid size=(\d+)>/g, '<Grid item xs=$1>');
  
  if (code !== original) {
    fs.writeFileSync(filePath, code);
    const name = path.relative(d, filePath);
    console.log('Reverted: ' + name);
    return true;
  }
  return false;
}

let count = 0;
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp);
    else if (f.endsWith('.jsx') || f.endsWith('.tsx')) {
      if (revertGrid(fp)) count++;
    }
  }
}

walk(d);
console.log('\nReverted ' + count + ' files');
