import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memory;

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI environment variable is not set!");
      // fallback to in-memory for quick local testing
      memory = await MongoMemoryServer.create();
      uri = memory.getUri();
      console.log("Using in-memory MongoDB instance");
    }
    const conn = await mongoose.connect(uri);
    console.log("Connected to database", conn.connection.host);
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};


