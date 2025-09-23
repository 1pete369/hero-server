// server.js
import http from "http";
import dotenv from "dotenv";
import app from "./index.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const PORT = process.env.PORT || 5002;

const server = http.createServer(app);

connectDB()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Auth server listening on 0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });


