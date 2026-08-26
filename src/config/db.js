const mongoose = require('mongoose');
const dns = require('dns');

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (dnsErr) {
  console.warn('DNS configuration warning:', dnsErr.message);
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://dhruvsavaliya83:4vBA3RcwS8S9ALUi@cluster0-shard-00-00.a5hzm.mongodb.net:27017,cluster0-shard-00-01.a5hzm.mongodb.net:27017,cluster0-shard-00-02.a5hzm.mongodb.net:27017/nayzora_admin?ssl=true&replicaSet=atlas-otbs38-shard-0&authSource=admin&retryWrites=true&w=majority';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      family: 4,
      tls: true,
      tlsAllowInvalidCertificates: true
    });
    console.log(`✅ MongoDB Connected (Atlas Cluster): ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    console.warn("Retrying MongoDB connection in 10 seconds...");
    setTimeout(connectDB, 10000);
  }
};

module.exports = connectDB;
