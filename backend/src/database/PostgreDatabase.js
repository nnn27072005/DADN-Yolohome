const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

let poolConfig;

if (process.env.DATABASE_URL) {
  // Ưu tiên dùng DATABASE_URL (Render cung cấp tự động)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
} else {
  // Dùng các biến môi trường riêng lẻ (dùng cho local hoặc config thủ công)
  poolConfig = {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

module.exports = { pool };


