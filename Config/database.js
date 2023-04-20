const mysql = require('mysql');

// Adatbázis-kapcsolat létrehozása
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,

});

module.exports = connection;