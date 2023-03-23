const bcrypt = require('bcrypt');
const connection = require('../config/db')

// ÚJ ESEMÉNY LÉTREHOZÁSA
function AddNewEvent(connection) {
  return async (req, res) => {
    try {
      // Adatbevitel konvertálása Int típusra
      // var eventAge = req.body.eventAgelimit;
      // if (eventAge == "Korhatár nélküli") {eventAge = 0;}
      // if (eventAge == "12+") {eventAge = 12;}
      // if (eventAge == "16+") {eventAge = 16;}
      // if (eventAge == "18+") {eventAge = 18;}

      var ageLimits = {
        "Korhatár nélküli": 0,
        "12+": 12,
        "16+": 16,
        "18+": 18
      };
      var eventAge = ageLimits[req.body.eventAgelimit] || 0;

      // Adatbázis feltöltése
      const insertEvent = new Promise((resolve, reject) => {
        connection.query(
          "SELECT MAX(id) AS maxId FROM locations",
          function (err, results) {
            if (err) {
              console.error("Error retrieving max location id: " + err.stack);
              reject(err);
            }
            var maxLocId = 1 + results[0].maxId; // az utolsó id érték
            connection.query(
              "INSERT INTO eventproperties (name, description, url_link, agelimit, date, category, loc_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [
                req.body.eventName,
                req.body.eventDescription,
                req.body.eventImgURL,
                parseInt(eventAge),
                req.body.eventDay,
                req.body.eventCategory,
                maxLocId,
              ],
              function (err) {
                if (err) {
                  console.error("Hiba történt az adatok felvitele során [eventproperties]: " + err.stack);
                  reject(err);
                }
                // console.log("Sikeres adatfelvitel az eventproperties táblába!");
                resolve();
              }
            );
          }
        );
      });

      const insertPerformers = new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO performers (name) VALUES (?)",
          [req.body.eventPerformers],
          function (err) {
            if (err) {
              console.error("Hiba történt az adatok felvitele során [performers]: " + err.stack);
              reject(err);
            }
            resolve();
          }
        );
      });

      const insertLocations = new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO locations (city, street, house_number, capacity) VALUES (?,?,?,?)",
          [
            req.body.eventCity,
            req.body.eventStreet,
            req.body.eventHno,
            req.body.eventCapacity,
          ],
          function (err) {
            if (err) {
              console.error("Hiba történt az adatok felvitele során [locations]: " + err.stack);
              reject(err);
            }
            resolve();
          }
        );
      });

      // Megvárjuk, hogy az összes adatbázis művelet befejeződjön
      await Promise.all([insertEvent, insertPerformers, insertLocations]);

      const getLastEventId = () => {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT id FROM eventproperties ORDER BY id DESC LIMIT 1",
            (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(parseInt((results[0].id)));
              }
            }
          );
        });
      };

      // Utolsó beszúrt id lekérdezése a performers táblából
      const getLastPerformerId = () => {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT id FROM performers ORDER BY id DESC LIMIT 1",
            (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(parseInt((results[0].id)));
              }
            }
          );
        });
      };

      // Beszúrás az events_perfomers táblába
      const insertEventsPerformers = async () => {
        try {
          const lastEventId = await getLastEventId();
          const lastPerformerId = await getLastPerformerId();
          const query ="INSERT INTO events_perfomers (performs_id, events_id) VALUES (?, ?);";

          const values = [lastPerformerId,lastEventId, ];
          connection.query(query, values, (error, results) => {
            if (error) {
              console.error(
                "Hiba történt az adatok felvitele során [events_perfomers >< ]:" + error.stack
              );
              return;
            }
            // console.log("Sikeres adatfelvitel az events_perfomers kapcsolótáblába!");
          });
        } catch (error) {
          console.error("Hiba az utolsó ID feltöltése során!" + error.stack);
        }
      };

      insertEventsPerformers();
      res.redirect("/adminpage");

    } catch (e) {
      console.log(e);
      res.redirect("/adminpage");
    }
  };
}

// ÚJ ADMINISZTRÁTOR RÖGZÍTÉSE
function AddNewAdmin(connection, fs) {
  return async (req, res) => {
    const password = req.body.password;
    const password2 = req.body.password_match;
    if (password == password2) {
      try {
        // Email ellenőrzése
        connection.query(`SELECT * FROM users WHERE email="${req.body.email}"`, async (err, results) => {
          if (err) {
            console.error('Hiba a regisztráció során: ' + err.stack);
            return res.redirect("/");
          }
          if (results.length > 0) {
            res.locals.message = "Az e-mail cím már használatban van!";
            return res.redirect("/");
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
            "admin"
          )`, (err) => {
            if (err) {
              console.error('Hiba a regisztráció során: ' + err.stack);
              return res.redirect("/");
            }
            // console.log('Sikeresen hozzáadta az admin-t!');
            res.redirect("/");
          });
        });
        
      } catch (e) {
        console.log(e);
      }
    } else {
      res.locals.message = "A két jelszó nem egyezik!";
      res.redirect("/");
    }
  };
}


// ESEMÉNY TÖRLÉSE 
function deleteEvent(id) {

  // 1. LÉPÉS: users_events kapcsolótáblából való törlés
  connection.query(`SELECT * FROM users_events WHERE events_id=${id};`, (err, result) => {
    if (err) throw err;

  // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM users_events WHERE events_id = ${id};`, (err, result) => {
      if (err) throw err;
      // console.log(`A(z) ${id} azonosítójú rekord törölve lett az users_events táblából.`);
    });
  });

  // 2. LÉPÉS: Kapcsolótáblából+Performers való törlés
  connection.query(`SELECT performs_id FROM events_perfomers WHERE events_id=${id};`, (err, result) => {
    if (err) throw err;

   // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM events_perfomers WHERE performs_id = ${result[0].performs_id};`, (err, result) => {
      if (err) throw err;
      // console.log(`A(z) ${result[0].performs_id} azonosítójú rekord törölve lett az events_perfomers táblából.`);
    });

    // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM performers WHERE id = ${result[0].performs_id};`, (err, result) => {
      if (err) throw err;
      // console.log(`A(z) ${result[0].performs_id} azonosítójú rekord törölve lett az performs táblából.`);
    });

    // 3. LÉPÉS: Esemény + Esemény helyszín törlés
    connection.query(`SELECT loc_id FROM eventproperties WHERE id=${id};`, (err, result) => {
      if (err) throw err;

    // Az events_perfomers táblából történő törlés
      connection.query(`DELETE FROM eventproperties WHERE loc_id = ${result[0].loc_id};`, (err, result) => {
        if (err) throw err;
        // console.log(`A(z) ${result[0].loc_id} azonosítójú rekord törölve lett az eventproperties táblából.`);
      });

      // Az events_perfomers táblából történő törlés
      connection.query(`DELETE FROM locations WHERE id = ${result[0].loc_id};`, (err, result) => {
        if (err) throw err;
        // console.log(`A(z) ${result[0].loc_id} azonosítójú rekord törölve lett az locations táblából.`);
      });
    });
  });
}


module.exports = {AddNewEvent,AddNewAdmin,deleteEvent};
