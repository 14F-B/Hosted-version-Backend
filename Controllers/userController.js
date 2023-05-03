const connection = require("../Config/database");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");


// FELHASZNÁLÓ TÖRLÉSE
async function deleteUserById(id) {
  return new Promise((resolve, reject) => {
    connection.getConnection(async (err, connection) => {
      if (err) {
        console.log(err);
        reject({ status: 500, message: "Hiba a kapcsolat létrehozásakor" });
        return;
      }

      try {
        const deleteUserEventsQuery = "DELETE FROM users_events WHERE users_id = ?";
        await connection.query(deleteUserEventsQuery, [id]);
        
        const deleteUserQuery = "DELETE FROM users WHERE id = ?";
        await connection.query(deleteUserQuery, [id]);

        // console.log("Sikeres felhasználó törlés");
        connection.release();
        resolve({ status: 200, message: "Felhasználó törlése sikeres" });
      } catch (err) {
        console.log(err);
        connection.release();
        reject({ status: 500, message: "Hiba a felhasználó törlésekor" });
      }
    });
  });
}








// JELENTKEZÉS EGY ESEMÉNYRE
async function applyToLocation(locationId,userId,eventId,eventDate,eventAge,userBirthday,email) {
  try {
    const results = await checkCapacity(locationId);
    const applied = results[0].applied;
    const capacity = results[0].capacity;
    const userAge = await Math.round((new Date(eventDate) - new Date(userBirthday)) / (1000 * 60 * 60 * 24 * 365.25));

 
    if (applied < capacity && userAge >= eventAge) {
      await updateAppliedCount(locationId);
      const passCode = await generatePassCode();
      await addUserToEvent(eventId, userId, passCode);
      const eventData = await getEventData(locationId);
      const emailSent = await sendConfirmationEmail(eventData, email,passCode);
      console.log(emailSent ? "Email elküldve!" : "Hiba történt az email küldése közben!");
      return { statusCode: 200, message: "Sikeres jelentkezés!" };
    } else if (applied >= capacity) {
      return { statusCode: 400, message: "A helyszín telítve van!" };
    } else if (userAge < eventAge) {
      return { statusCode: 400, message: "Nem felel meg a korhatári követelménynek!" };
    }
  } catch (error) {
    console.error(error);
  }
}

// Kapacitás ellenőrzése
function checkCapacity(locationId) {
  const checkCapacityQuery = `SELECT applied, capacity FROM locations WHERE id = ${locationId};`;
  return new Promise((resolve, reject) => {
    connection.query(checkCapacityQuery, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
        console.log(results)

      }
    });
  });
}

// Jelentkezettek számának frissítése
function updateAppliedCount(locationId) {
  const query = `UPDATE locations SET applied = applied + 1 WHERE id = ${locationId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Belépőkód generálása
function generatePassCode() {
  return uuidv4({
    node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab],
    clockseq: 0x1234,
    msecs: new Date("2022-01-01").getTime(),
    nsecs: 5678,
  });
}

// Kapcsolótábla feltöltése
function addUserToEvent(eventId, userId, passCode) {
  const query = `INSERT INTO users_events (events_id, users_id, event_pass_code) VALUES (${eventId},${userId},${'"' + passCode + '"'})`;
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
        console.log(results)
      }
    });
  });
}

// Esemény adatainak lekérdezése
function getEventData(locationId) {
  const query = `SELECT * FROM eventproperties 
                 JOIN locations ON eventproperties.loc_id = locations.id 
                 WHERE locations.id = ${locationId};`;
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        const eventData = results[0];
        const date = new Date(eventData.date);
        const formattedDate = new Intl.DateTimeFormat("hu-HU", {     
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit", }).format(date);
        eventData.date = formattedDate;
        resolve(eventData);
      }
    });
  });
}

// Tájékoztató email küldése
async function sendConfirmationEmail(eventData, email,passCode) {
  const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "sipos.roland@students.jedlik.eu",
      pass: process.env.GMAIL_PW,
    },
  });

  const details = {
    from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
    to: email,
    subject: `GO EVENT! - ${eventData.name} PROGRAM VISSZAIGAZOLÁS`,
    attachments: [{
      filename: 'logo.png',
      path: './public/pictures/logo.png',
      cid: 'logo',
    }],
    html: `<img style="width:190px; height:33px;" src="cid:logo" /><br>Köszönjük, hogy regisztrált weboldalunkon az eseményre.
        
          <h4>Adatok a foglalással kapcsolatban:</h4><br><br>
          
          <b>Esemény neve:</b> ${eventData.name}<br>
          <b>Helyszín:</b>  ${eventData.city}, ${eventData.street}${eventData.house_number ? ` ${eventData.house_number}.` : ''}<br>
          <b>Időpont:</b> ${eventData.date}<br><br>

          <b>Belépéshez szükséges kód:</b> ${passCode}<br> 
          <i>(Kérjük ne ossza meg ezt az adatot más személlyel!)</i><br><br>
    
          Jó szórakozást kívánunk!<br><br>
    
    
          Üdvözlettel: GO EVENT! Csapata
          `,
  };
  
  return mailTransporter.sendMail(details)
   

}



// ESEMÉNY VISSZAMONDÁSA
async function cancelApplication(locationId, userId, eventId, email) {
  try {
    const checkQuery = `SELECT * FROM users_events WHERE users_id = ${userId} AND events_id=${eventId};`;
    const checkResults = await new Promise((resolve, reject) => {
      connection.query(checkQuery, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
    if (checkResults.length === 0) {
      // console.error("A megadott felhasználó és esemény páros nem található az adatbázisban");
    } else {
      // Kapcsolótábla rekordjának törlése
      const deleteQuery = `DELETE FROM users_events WHERE users_id = ${userId} AND events_id=${eventId};`;
      await new Promise((resolve, reject) => {
        connection.query(deleteQuery , (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
      const alldataquery = `SELECT * FROM eventproperties 
                            JOIN locations ON eventproperties.loc_id = locations.id 
                            WHERE locations.id = ${locationId};`;
      const queryResults = await new Promise((resolve, reject) => {
        connection.query(alldataquery, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
      // Visszamondó email kiküldése
      const mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "sipos.roland@students.jedlik.eu",
          pass: process.env.GMAIL_PW,
        },
      });
      const details = {
        from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
        to: '"' + email + '"',
        subject: `GO EVENT! - ${queryResults[0].name} PROGRAM VISSZAMONDÁS`,
        attachments: [
          {
            filename: "logo.png",
            path: "./public/pictures/logo.png",
            cid: "logo",
          },
        ],
        html: `<img style="width:190px; height:33px;" src="cid:logo" /><br>Ön visszamondta a(z) <b>${queryResults[0].name}</b> eseményt,<br>
                így töröltük részvételi igényét a rendszerünkből.<br><br>


                <i>Böngésszen további programjaink közt!</i><br><br>


                Üdvözlettel: GO EVENT! Csapata
                `,
      };
      await new Promise((resolve, reject) => {
        mailTransporter.sendMail(details, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      mailTransporter.close(); // Bezárjuk a transporter kapcsolatát

      // Aktuális létszám csökkentése
      const query = `UPDATE locations SET applied = applied - 1 WHERE id = ${locationId}`;
      await new Promise((resolve, reject) => {
        connection.query(query, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    }
  } catch (error) {
    console.error(error);
  }
}





// HÍRLEVÉL TARTALMÁNAK TOVÁBBÍTÁSA
function contactForm(senderName, senderEmail, subject, message) {
  const date = new Date();
  const date_format = date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  let mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "sipos.roland@students.jedlik.eu",
      pass: process.env.GMAIL_PW,
    },
  });

  let details = {
    from: '"GO EVENT! ŰRLAP" <sipos.roland@students.jedlik.eu>',
    to: "goeventhungary@gmail.com",
    subject: "Űrlapkitöltés :  " + subject,
    html: `Űrlapkitöltés érkezett az alábbi adatokkal:<br><br>
                        <span style="font-weight:bold; padding:16px; color: #131647;">Név: </span>${senderName}<br>
                        <span style="font-weight:bold; padding:16px; color: #131647;">Email cím:</span> ${senderEmail}<br>
                        <span style="font-weight:bold; padding:16px; color: #131647;">Tárgy: </span> ${subject}<br>
                        <span style="font-weight:bold; padding:16px; color: #131647;">Üzenet: </span> ${message}<br>
                        <span style="font-weight:bold; padding:16px; color: #131647;">Kitöltés dátuma: </span>${date_format}<br>`,
  };

  mailTransporter.sendMail(details, (err) => {
    if (err) {
      console.log("Hiba az email kiküldése során!", err);
    } else {
      // console.log("Email elküldve!");
    }
  });
}

module.exports = {
  deleteUserById,
  applyToLocation,
  cancelApplication,
  contactForm,
};
