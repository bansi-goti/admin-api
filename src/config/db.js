const mongoose = require('mongoose');
const dns = require('dns');

// Prefer IPv4 resolution order on Windows/local networks to avoid slow IPv6 lookups
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (dnsErr) {
  console.warn('DNS configuration warning:', dnsErr.message);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {

    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;