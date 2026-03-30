const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod = null;

const connectDB = async () => {
  try {
    // Try connecting to the configured MongoDB URI first
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/creditsaathi";
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`📦 MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.log(`⚠️  Could not connect to MongoDB. Starting in-memory database...`);
    try {
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`📦 MongoDB In-Memory connected: ${memUri}`);
    } catch (memError) {
      console.error(`❌ MongoDB connection failed: ${memError.message}`);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

module.exports = { connectDB: connectDB, disconnectDB };
