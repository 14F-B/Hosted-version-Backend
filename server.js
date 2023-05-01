if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
// Importálások
const express = require("express");
const app = express();
const port = 5172;
const routes = require("./routes");
const cors = require("cors")
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');


// Függőségek
app
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use(cors({ origin: '*' }))
  .use("/docs", routes)
  .use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
  .use('/', (req, res, next) => {
    res.setHeader('accept', 'text/plain'); // 'accept' fejléc beállítása
    res.setHeader('Content-Type', 'application/json'); // 'Content-Type' fejléc beállítása
    swaggerUi.setup(swaggerDocument)(req, res, next); // Swagger UI beállítása
  });
  


// HELYI HÁLÓZAT
app.listen(port, () => {
  console.log('\u001b[' + 32 + 'm' + 'GO EVENT! Backend server:  ' + '\u001b[0m'+`http://localhost:${port}`)

});
