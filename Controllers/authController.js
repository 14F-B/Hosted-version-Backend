const bcrypt = require("bcrypt");
const connection = require('../Config/database');
const nodemailer = require("nodemailer");


// Általános regisztráció
function signUp(connection) {
  return async (req, res) => {
    const password = req.body.password;
    const password2 = req.body.password_match;
    if (password == password2) {
      try {
        // Email ellenőrzése
        const email = req.body.email;
        connection.query(`SELECT * FROM users WHERE email="${email}"`, async (err, results) => {
          if (err) {
            console.error('Hiba a regisztráció során: ' + err.stack);
            return res.sendStatus(500); // 500 státuszkód hozzáadása
          }
          if (results.length > 0) {
            res.locals.message = "Az e-mail cím már használatban van!";
            return res.sendStatus(200); // 200 státuszkód hozzáadása
          }
          // Ha az e-mail cím még nem szerepel az adatbázisban, akkor a felhasználói adatokat hozzáadjuk
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          connection.query(`INSERT INTO users (name, email, password, nationality, gender, birthdate, permission) VALUES (
            "${req.body.name}", 
            "${req.body.email}", 
            "${hashedPassword}", 
            "${req.body.citizenship}", 
            "${req.body.gender}", 
            "${req.body.birthday}", 
            "user"
          )`, (err) => {
            if (err) {
              console.error('Hiba a regisztráció során: ' + err.stack);
              return res.sendStatus(500); // 500 státuszkód hozzáadása
            }
            // console.log('Sikeresen regisztráció');
            res.sendStatus(200); // 200 státuszkód hozzáadása
          });
        });
        
      } catch (e) {
        console.log(e);
        res.sendStatus(500); // 500 státuszkód hozzáadása
      }
    } else {
      res.locals.message = "A két jelszó nem egyezik!";
      res.sendStatus(200); // 200 státuszkód hozzáadása
    }
  };
}




async function forgotPassword(email) {
    connection.query(`SELECT * FROM users WHERE email = '${email}'`, async (error, results) => {
      if (error) {
        console.error(error);
      } else if (results.length === 0) {
        console.log("Az adott e-mail cím nem található az adatbázisban."); // VISSZA KELL KÜLDENI A WEBOLDALNAK!!
      } else {
        const newPassword = generateRandomPassword(); // Véletlenszerű jelszó generálása
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
  
        connection.query(`UPDATE users SET password = '${newPasswordHash}' WHERE email = '${email}'`, (error) => {
          if (error) {
            console.error(error);
          } else {
            console.log("A jelszó sikeresen módosítva lett.");
  
          }
          let mailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "sipos.roland@students.jedlik.eu",
              pass: process.env.GMAIL_PW
            },
          });
        
          let details = {
            from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
            to: '"'+email+'"',
            subject: "GO EVENT! - Új jelszó",
            html: `Ön új jelszót igényelt a GO EVENT! felületén.<br><br>
              
            <b>Az új jelszó amivel be tud lépni:</b> ${newPassword}<br>
            <i>(Belépést követően a profilban meg tudja változtatni.)</i><br><br>
            


            Amennyiben nem Ön kérelmezte a jelszó módosítást, kérjük vegye fel velünk a kapcsolatot a goeventhungary@gmail.com címen!<br><br>


            Üdvözlettel: GO EVENT! Csapata
            `,
          };
        
          mailTransporter.sendMail(details, (err) => {
            if (err) {
              console.log("Hiba történt az email kiküldése során!", err);
            } else {
              // console.log("Email elküldve!");
            }
          });
        });
      }
    });
    }
  
  // Véletlenszerű jelszó generálása
  function generateRandomPassword() {
    const length = 10;
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }



  
function changePassword(userId, oldPassword, newPassword, newPasswordMatch, callback) {
  // Két jelszó egyezés vizsgálata
  if (newPassword !== newPasswordMatch) {
    callback('Az új jelszavak nem egyeznek meg');
    return;
  }

  // Jelenlegi jelszó ellenőrzése adatbázisból
  connection.query('SELECT password FROM users WHERE id = ?', [userId], function (error, results) {
    if (error) {
      callback('Adatbázis hiba');
      return;
    }
    const storedPassword = results[0].password;
    bcrypt.compare(oldPassword, storedPassword, function (error, result) {
      if (error) {
        callback('Hiba történt a jelszó ellenőrzésekor');
        return;
      }

      if (!result) {
        callback('A megadott jelenlegi jelszó helytelen');
        return;
      }

      // Új jelszó aktualizálása az adatbázisban
      bcrypt.hash(newPassword, 10, function (error, hash) {
        if (error) {
          callback('Hiba történt a jelszó hashelésekor');
          return;
        }

        connection.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId], function (error, results) {
          if (error) {
            callback('Adatbázis hiba');
            return;
          }
        // Sikeres jelszóváltoztatás
          callback(null); 
        });
      });
    });
  });
}

module.exports = {signUp,forgotPassword,changePassword};