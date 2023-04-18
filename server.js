if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
// Importálások
const express = require("express");
const app = express();
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const port = 5172;
const routes = require("./routes");
const cookieParser = require('cookie-parser');
const cors = require("cors")
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');


// Függőségek
app
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use(cors({origin:'https://goeventhungary.netlify.app'}))
  .use(flash())
  .use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  )
  .use(passport.initialize())
  .use(passport.session())
  .use(methodOverride("_method"))
  .use(cookieParser())
  .use("/docs", routes)
  .use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument))




// HELYI HÁLÓZAT
app.listen(port, () => {
  console.log('\u001b[' + 32 + 'm' + 'GO EVENT! Backend server:  ' + '\u001b[0m'+`http://localhost:${port}`)

});
