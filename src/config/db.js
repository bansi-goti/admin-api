const mongoose = require('mongoose');
const dns = require('dns');

// Set public DNS servers to resolve MongoDB SRV records on Windows/local networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (dnsErr) {
  console.warn('DNS server configuration warning:', dnsErr.message);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are mostly deprecated in modern mongoose, but keeping clean setup
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;