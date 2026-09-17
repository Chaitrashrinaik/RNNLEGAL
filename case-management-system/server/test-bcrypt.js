const bcrypt = require('bcryptjs');
async function test() {
  const pw = 'newpass123';
  const hash = await bcrypt.hash(pw, 12);
  console.log('Hash:', hash);
  const match = await bcrypt.compare('newpass123', hash);
  console.log('Match:', match);
}
test();