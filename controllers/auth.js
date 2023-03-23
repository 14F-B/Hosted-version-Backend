const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const connection = require('../config/db');

function initialize(passport) {
  const authenticateUser = async (email, password, done) => {
    try {
      // Ellenőrzés az adatbázis adataiból
      connection.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
          return done(error);
        }
        const user = results[0];
        if (!user) {
          return done(null, false, { message: "Nincs felhasználó az adatbázisban!" });
        }
        try {
          if (await bcrypt.compare(password, user.password)) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Helytelen a jelszó"});
          }
        } catch (e) {
          console.log(e);
          return done(e);
        }
      });
    } catch (e) {
      console.log(e);
      return done(e);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    // ID lekérés
    connection.query('SELECT * FROM users WHERE id = ?', [id], (error, results) => {
      if (error) {
        return done(error);
      }
      
      return done(null, results[0]);
    });
  });
}


module.exports = initialize;    