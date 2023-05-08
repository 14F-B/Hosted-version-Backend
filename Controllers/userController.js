const connection = require("../Config/database");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// ****************************************************** \\
// **       F E L H A S Z N Á L Ó   T Ö R L É S E     **  \\
// ****************************************************** \\
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







// ****************************************************** \\
// ** J E L E N T K E Z É S  E G Y   E S E M É N Y R E **  \\
// ******************************************************* \\
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
      return { statusCode: 400, message: "Nem felelsz meg a korhatári követelménynek!" };
    }
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return { statusCode: 400, message: " Erre az eseményre már regisztráltál !" };
    } else {
      return { statusCode: 500, message: " Hiba történt a feldolgozás során !" };

    }
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

  const htmlContent = await getHtmlApply(eventData,passCode);
  const details = {
    from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
    to: email,
    subject: `GO EVENT! - ${eventData.name} PROGRAM VISSZAIGAZOLÁS`,
    attachments: [{
      filename: 'logo.png',
      path: './public/pictures/logo.png',
      cid: 'logo',
    }],
    html: htmlContent,
  };
  
  return mailTransporter.sendMail(details)
   

}
// Visszaigazoló email sablonja
async function getHtmlApply(eventData,passCode) {
  const path = require('path');
  const fs = require('fs').promises; // promises alapú fs modul használata
  const filePath = path.join(__dirname, '..', 'Template', 'ApplyTemplate.html');
  const fileContent = await fs.readFile(filePath, 'utf-8'); // await használata a fájl olvasásánál
  const replacedContent = `
  ${fileContent
        .replace('{{eventName}}', eventData.name)
        .replace('{{eventCity}}', eventData.city)
        .replace('{{eventStreet}}', eventData.street)
        .replace('{{eventHouseNumber}}', eventData.house_number ? ` ${eventData.house_number}.` : '')
        .replace('{{eventDate}}', eventData.date)
        .replace('{{passCode}}', passCode)}
`;
  return replacedContent;

}



// ****************************************************** \\
// **        E S E M É N Y    L E M O N D Á S A       **  \\
// ****************************************************** \\
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
      const htmlContent = await getHtmlCancelapplied(queryResults[0].name);
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
        html: htmlContent,
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
      mailTransporter.close();

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
// Lemondó email szövege sablonja
async function getHtmlCancelapplied(eventname) {
  const path = require('path');
  const fs = require('fs').promises;
  const filePath = path.join(__dirname, '..', 'Template', 'CancelAppliedTemplate.html');
  const fileContent = await fs.readFile(filePath, 'utf-8'); 
  const replacedContent = `
  ${fileContent.replace('{{ eventname }}', eventname)}
`;
  return replacedContent;
}





// ****************************************************** \\
// **   KAPCSOLATI ŰRLAP TARTALMÁNAK TOVÁBBÍTÁSA      **  \\
// ****************************************************** \\
async function contactForm(senderName, senderEmail, subject, message) {
  const date = new Date();
  const date_format = formatDate(date);
  const htmlContent = await getHtmlContactForm(senderName, senderEmail, subject, message, date_format);

  const details = {
    from: '"GO EVENT! ŰRLAP" <sipos.roland@students.jedlik.eu>',
    to: "goeventhungary@gmail.com",
    subject: "Űrlapkitöltés :  " + subject,
    html: htmlContent,
  };

  const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "sipos.roland@students.jedlik.eu",
      pass: process.env.GMAIL_PW,
    },
  });

  try {
    await mailTransporter.sendMail(details);
    console.log("Email elküldve!");
  } catch (err) {
    console.log("Hiba az email kiküldése során!", err);
  }
}

// Dátum formázása
function formatDate(date) {
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Kapcsolati űrlap sablonja
async function getHtmlContactForm(senderName, senderEmail, subject, message, date_format) {
  const path = require('path');
  const fs = require('fs').promises; 
  const filePath = path.join(__dirname, '..', 'Template', 'ContactFormTemplate.html');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const replacedContent = `
  ${fileContent.replace('{{ senderName }}', senderName)
              .replace('{{ senderEmail }}', senderEmail)
              .replace('{{ subject }}', subject)
              .replace('{{ message }}', message)
              .replace('{{ date_format }}', date_format)}
`;
  return replacedContent;
}

module.exports = {
  deleteUserById,
  applyToLocation,
  cancelApplication,
  contactForm,
};
