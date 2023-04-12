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
const initializePassport = require("./Controllers/passportController");
const routes = require("./routes");
const cookieParser = require('cookie-parser');
const cors = require("cors")


// Függőségek
app
  .use("/public", express.static(__dirname + "/public"))
  .set("view engine", "ejs")
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use(cors())
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
  .use("/", routes)


// Login  &  Sign up
initializePassport(
  passport,
  (email) => users.find((user) => user.email === email),
  (id) => users.find((user) => user.id === id)
);


// HELYI HÁLÓZAT
app.listen(port, () => {
  console.log('\u001b[' + 32 + 'm' + 'Backend:  ' + '\u001b[0m'+`http://localhost:${port}`)

});
