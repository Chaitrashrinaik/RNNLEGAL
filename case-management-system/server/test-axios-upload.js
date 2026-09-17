const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
  // First login
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    email: 'nagendrank@gmail.com',
    password: 'admin@123'
  });
  
  const token = loginRes.data.data.token;
  console.log('Token obtained');
  
  // Create form data
  const form = new FormData();
  form.append('avatar', fs.createReadStream('C:\\Users\\BS-24\\Documents\\Default Project\\case-management-system\\server\\uploads\\documents\\a2a5dbff-b763-4b2b-81f3-ed0d9eb4bc56.png'));
  
  console.log('Form data headers:', form.getHeaders());
  
  // Upload
  try {
    const res = await axios.post('http://localhost:5000/api/auth/upload-avatar', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Status:', res.status);
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data);
  }
}

testUpload();