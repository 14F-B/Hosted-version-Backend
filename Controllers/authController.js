const bcrypt = require("bcrypt");
const connection = require('../Config/database');
const nodemailer = require("nodemailer");

// LOGIN BEJELENTKEZÉS
function login(connection) {
  return async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Email alapján felhasználó adatainak lekérése
  connection.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Hiba történt az adatbázis lekérdezése közben." });
    } else if (result.length === 0) {
      // Hibás email, vagy jelszó
      res.status(401).json({ message: "Hibás email vagy jelszó.", email });
    } else {
      // Felhasználó adatainak elküldése a kliensnek
      const user = result[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Hiba történt a jelszó ellenőrzése közben." });
        } else if (!isMatch) {
          // Hibás email, vagy jelszó
          res.status(401).json({ message: "Hibás email vagy jelszó.", email });
        } else {
          // Sikeres bejelentkezés, user adatainak elküldése a kliensnek
          res.status(200).json({ user });
        }
      });
    }
  });
};
}




// ÁLTALÁNOS REGISZTRÁCIÓ
function signUp(connection) {
  return async (req, res) => {
    if (req.body.password == req.body.password_match) {
      try {
        // Email ellenőrzése
        connection.query('SELECT * FROM users WHERE email = ?', [req.body.email], async (err, results) => {
          if (err) {
            console.error('Hiba a regisztráció során: ' + err.stack);
            return res.status(500).send({ error: "Internal Server Error", message: "Adatbázis kapcsolat megszakadt" });
          }
          if (results.length > 0) {
            res.locals.message = "Az e-mail cím már használatban van!";
            return res.status(409).send({ error: "Conflict", message: "Az e-mail cím már használatban van!" });
          }
          // Ha az e-mail cím még nem szerepel az adatbázisban, akkor a felhasználói adatokat hozzáadjuk
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          connection.query('INSERT INTO users (name, email, password, nationality, gender, birthdate, permission) VALUES (?, ?, ?, ?, ?, ?, "user")', 
          [req.body.name, req.body.email, hashedPassword, req.body.citizenship, req.body.gender, req.body.birthday], (err) => {
            if (err) {
              console.error('Hiba a regisztráció során: ' + err.stack);
              return res.status(500).send({ error: "Internal Server Error", message: "Adatbázis kapcsolat megszakadt" });
            }
            // console.log('Sikeresen regisztráció');
            return res.status(200).send({ error: "Success", message: "Sikeres regisztráció!" });
          });
        });
        
      } catch (e) {
        console.log(e);
        return res.status(500).send({ error: "Internal Server Error", message: "Adatbázis kapcsolat megszakadt" });
      }
    } else {
      return res.status(400).send({ error: "Bad request", message: "A két jelszó nem egyezik!" });
    }
  };
}



// ELFELEJTETT JELSZÓ - JELSZÓGENERÁLÁS
async function forgotPassword(email) {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      throw { statusCode: 400, message: "Az adott e-mail cím nem található az adatbázisban." };
    }
    const newPassword = generateRandomPassword(); // Véletlenszerű jelszó generálása
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await updateUserPasswordByEmail(email, newPasswordHash);
    
    const mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "sipos.roland@students.jedlik.eu",
        pass: process.env.GMAIL_PW
      },
    });
    
    const mailOptions = {
      from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
      to: email,
      subject: "GO EVENT! - Új jelszó",
      html: `Ön új jelszót igényelt a GO EVENT! felületén.<br><br>
        <b>Az új jelszó amivel be tud lépni:</b> ${newPassword}<br>
        <i>(Belépést követően a profilban meg tudja változtatni.)</i><br><br>
        Amennyiben nem Ön kérelmezte a jelszó módosítást, kérjük vegye fel velünk a kapcsolatot a goeventhungary@gmail.com címen!<br><br>
        Üdvözlettel: GO EVENT! Csapata`,
    };
    
    await sendMail(mailTransporter, mailOptions);
    return { statusCode: 200, message: "A jelszó sikeresen módosítva lett, az új jelszó elküldve a felhasználónak." };
  } catch (error) {
    console.error(error);
    throw { statusCode: 500, message: "Hiba történt a jelszó módosítása során." };
  }
}

// Jelszógenerálás
function generateRandomPassword(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Felhasználó ellenőrzése email alapján
async function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM users WHERE email = ?", email, (error, results, fields) => {
      if (error) {
        reject(error);
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
}

// Jelszó aktualizálása
async function updateUserPasswordByEmail(email, newPasswordHash) {
  await connection.query("UPDATE users SET password = ? WHERE email = ?", [newPasswordHash, email]);
}

// Jelszó megosztása a felhasználóval emailben
function sendMail(transporter, options) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(options, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}



// JELSZÓ MEGVÁLTOZTATÁSA USERPAGE OLDALON
async function changePassword(userId, oldPassword, newPassword, newPasswordMatch) {
  return new Promise((resolve, reject) => {
    // Két jelszó egyezésének vizsgálata
    if (newPassword !== newPasswordMatch) {
      reject('Az új jelszavak nem egyeznek meg');
      return;
    }

    // Jelenlegi jelszó ellenőrzése adatbázisból
    connection.query('SELECT password FROM users WHERE id = ?', [userId], async function (error, results) {
      if (error) {
        reject('Adatbázis hiba');
        return;
      }
      const storedPassword = results[0].password;
      try {
        const match = await bcrypt.compare(oldPassword, storedPassword);
        if (!match) {
          reject('A megadott jelenlegi jelszó helytelen');
          return;
        }

        // Új jelszó aktualizálása az adatbázisban
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        // Sikeres jelszóváltoztatás
        resolve();
      } catch (error) {
        reject(error.message);
      }
    });
  });
}


module.exports = {signUp,forgotPassword,changePassword,login};