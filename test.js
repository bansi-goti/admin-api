const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find an admin user to get their token
  const admin = await User.findOne({ role: 'admin' }) || await User.findOne();
  if (!admin) {
    console.log("No user found to test with");
    process.exit(1);
  }

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('name', 'Test Sub Admin');
    form.append('email', 'test@subadmin.com');
    form.append('password', '123456');
    form.append('uiRole', 'moderator');
    
    console.log("Sending POST request...");
    const res = await fetch('http://localhost:5000/api/sub-admins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (error) {
    console.log("Error:", error);
  }
  
  process.exit(0);
}

test();
