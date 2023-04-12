const connection = require("../Config/database");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
var QRCode = require("qrcode");
const fs = require("fs");

// FELHASZNÁLÓ TÖRLÉSE
function deleteUserById(id) {
  connection.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return;
    }

    const deleteUserEventsQuery = "DELETE FROM users_events WHERE users_id = ?";
    connection.query(deleteUserEventsQuery, [id], (err, result) => {
      if (err) {
        console.log(err);
        connection.release();
        return;
      }
      
      const deleteUserQuery = "DELETE FROM users WHERE id = ?";
      connection.query(deleteUserQuery, [id], (err, result) => {
        if (err) {
          console.log(err);
          connection.release();
          return;
        }
        
        // console.log("Sikeres felhasználó törlés");
        connection.release();
      });
    });
  });
}

// JELENTKEZÉS EGY ESEMÉNYRE
function applyToLocation(locationId,userId,eventId,userAge,eventAge,email) {
  const checkCapacityQuery = `SELECT applied, capacity FROM locations WHERE id = ${locationId};`;
  connection.query(checkCapacityQuery, (error, results) => {
    if (error) {
      console.error(error);
    } else {
      const applied = results[0].applied;
      const capacity = results[0].capacity;

      if (applied < capacity && userAge >= eventAge) {
        // a helyszín kapacitása még nem telítődött meg, és a felhasználó megfelelő korú
        const query = `UPDATE locations SET applied = applied + 1 WHERE id = ${locationId}`;
        connection.query(query, (error) => {
          if (error) {
            console.error(error);
          } else {
            // console.log(`Sikeresen jelentkezett a(z) ${locationId} helyszínre!`);
          }
        });
        // Egyedi belépőkód az eseményre
        const Pass_Code = uuidv4({
          node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab],
          clockseq: 0x1234,
          msecs: new Date("2022-01-01").getTime(),
          nsecs: 5678,
        });
      
        // Kapcsolótábla feltöltése a megfelelő adatokkal
        connection.query(
          `INSERT INTO users_events (events_id, users_id, event_pass_code) VALUES (${eventId},${userId},${'"' + Pass_Code + '"'})`,
          (error, results) => {
            if (error) {
              console.error(error);
            } else {
              const alldataquery = `SELECT * FROM eventproperties 
                                    JOIN locations ON eventproperties.loc_id = locations.id 
                                    WHERE locations.id = ${locationId};`;
              connection.query(alldataquery, (queryError, queryResults) => {
                if (queryError) {
                  console.error(queryError);
                } else {
                  const date = new Date(queryResults[0].date);
                  const formattedDate = new Intl.DateTimeFormat("hu-HU", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(date);
      
                  // QR kód generálása, az egyszerűbb ellenőrzés céljából
                  QRCode.toFile(__dirname +`/qrcodes/${Pass_Code}.png`, `${Pass_Code}`, {
                    errorCorrectionLevel: 'H'
                  }, function(err) {
                    if (err) throw err;
                    // console.log('QR kód sikeresen mentve!');
                  });
      
                  // Megerősítő email kiküldése
                  let mailTransporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                      user: "sipos.roland@students.jedlik.eu",
                      pass: process.env.GMAIL_PW,
                    },
                  });
      
                  let details = {
                    from: '"GO EVENT! Hungary" <sipos.roland@students.jedlik.eu>',
                    to: '"' + email + '"',
                    subject: `GO EVENT! - ${queryResults[0].name} PROGRAM VISSZAIGAZOLÁS`,
                    attachments: [{
                      filename: 'logo.png',
                      path: './public/pictures/logo.png', 
                      cid: 'logo',
                    },
                    {
                      filename: 'qrcode.png',
                      path: __dirname +`/qrcodes/${Pass_Code}.png`, 
                      cid: 'qrcode',
      
                     }],
                     
                    html: `<img style="width:190px; height:33px;" src="cid:logo" /><br>Köszönjük, hogy regisztrált weboldalunkon az eseményre.
                    
      
                <h4>Adatok a foglalással kapcsolatban:</h4><br><br>
                
                <b>Esemény neve:</b> ${queryResults[0].name}<br>
                <b>Helyszín:</b>  ${queryResults[0].city +", " +queryResults[0].street +" " +queryResults[0].house_number +"."}<br>
                <b>Időpont:</b> ${formattedDate}<br><br>
                <img src="cid:qrcode" /><br>
                <b>Belépéshez szükséges kód:</b> ${Pass_Code}<br> 
                <i>(Kérjük ne ossza meg ezt az adatot más személlyel!)</i><br><br>
      
                Jó szórakozást kívánunk!<br><br>
      
      
                Üdvözlettel: GO EVENT! Csapata
                `,
                  };
      
                  mailTransporter.sendMail(details, (err) => {
                    if (err) {
                      // console.log("Hiba történt az email küldése közben!", err);
                    } else {
                      // console.log("Email elküldve!");
      
                      // Helytakarékossági okból a generált QR kód törlése
                      fs.unlinkSync(__dirname +`/qrcodes/${Pass_Code}.png`);
                    }
                  });
                }
              });
            }
          }      
        )} 
        else if (applied >= capacity) {
        // console.log(`A helyszín telítve van!`);
        return;
      } else if (userAge < eventAge) {
        // console.log(`A felhasználó nem megfelelő korú az eseményhez!`);
        return;
      }
    }
  });
}


// ESEMÉNY VISSZAMONDÁSA
function cancelApplication(locationId, userId, eventId, email) {
  const checkQuery = `SELECT * FROM users_events WHERE users_id = ${userId} AND events_id=${eventId};`;
  connection.query(checkQuery, (checkError, checkResults) => {
    if (checkError) {
      console.error(checkError);
    } else if (checkResults.length === 0) {
      // console.error("A megadott felhasználó és esemény páros nem található az adatbázisban");
    } else {
      // Kapcsolótábla rekordjának törlése
      const query2 = `DELETE FROM users_events WHERE users_id = ${userId} AND events_id=${eventId};`;
      connection.query(query2, (deleteError, deleteResults) => {
        if (deleteError) {
          console.error(deleteError);
        } else {
          const alldataquery = `SELECT * FROM eventproperties 
                                JOIN locations ON eventproperties.loc_id = locations.id 
                                WHERE locations.id = ${locationId};`;
          connection.query(alldataquery, (queryError, queryResults) => {
            if (queryError) {
              console.error(queryError);
            } else {
              // Visszamondó email kiküldése
              let mailTransporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: "sipos.roland@students.jedlik.eu",
                  pass: process.env.GMAIL_PW,
                },
              });
              let details = {
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
                html: `<img style="width:130px; height:90px;" src="cid:logo" /><br>Ön visszamondta a(z) <b>${queryResults[0].name}</b> eseményt,<br>
                így töröltük részvételi igényét a rendszerünkből.<br><br>


                <i>Böngésszen további programjaink közt!</i><br><br>


                Üdvözlettel: GO EVENT! Csapata
                `,
              };
              mailTransporter.sendMail(details, (err) => {
                if (err) {
                  // console.log("Hiba történt az email küldése közben!", err);
                } else {
                  // console.log("Email elküldve!");
                }
              });
            }
          });
        }
      });
      // Aktuális létszám csökkentése
      const query = `UPDATE locations SET applied = applied - 1 WHERE id = ${locationId}`;
      connection.query(query, (error, results) => {
        if (error) {
          console.error(error);
        } else {
          // console.log(`Sikeresen törölte jelentkezési szándékát!`);
        }
      });
    }
  });
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
