const { Pool } = require("pg");
const ssl = String(process.env.DB_SSL || "false").toLowerCase() === "true"
  ? { rejectUnauthorized: false }
  : false;

module.exports = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl
});
