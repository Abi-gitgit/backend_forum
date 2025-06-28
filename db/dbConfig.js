require("dotenv").config();
const mysql2 = require("mysql2");

const dbconnection = mysql2.createPool({
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  connectionLimit: 10,
});

module.exports = dbconnection.promise();
