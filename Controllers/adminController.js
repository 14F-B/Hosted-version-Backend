connectionst bcrypt = require('bcrypt');
connectionst connection = require('../connectionfig/database')

// ÚJ ESEMÉNY LÉTREHOZÁSA
function AddNewEvent(connection) {
  return async (req, res) => {
    try {
      // Adatbevitel konvertálása Int típusra
      var ageLimits = {
        "Korhatár nélküli": 0,
        "12+": 12,
        "16+": 16,
        "18+": 18
      };
      var eventAge = ageLimits[req.body.eventAgelimit] || 0;

      // Adatbázis feltöltése
      connectionst insertEvent = new Promise((resolve, reject) => {
        connection.query(
          "SELECT MAX(id) AS maxId FROM locations",
          function (error, results) {
            if (error) {
              connectionsole.error("error retrieving max location id: " + error.stack);
              reject(error);
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
              function (error) {
                if (error) {
                  connectionsole.error("Hiba történt az adatok felvitele során [eventproperties]: " + error.stack);
                  reject(error);
                }
                // connectionsole.log("Sikeres adatfelvitel az eventproperties táblába!");
                resolve();
              }
            );
          }
        );
      });

      connectionst insertPerformers = new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO performers (name) VALUES (?)",
          [req.body.eventPerformers],
          function (error) {
            if (error) {
              connectionsole.error("Hiba történt az adatok felvitele során [performers]: " + error.stack);
              reject(error);
            }
            resolve();
          }
        );
      });

      connectionst insertLocations = new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO locations (city, street, house_number, capacity) VALUES (?,?,?,?)",
          [
            req.body.eventCity,
            req.body.eventStreet,
            req.body.eventHno,
            req.body.eventCapacity,
          ],
          function (error) {
            if (error) {
              connectionsole.error("Hiba történt az adatok felvitele során [locations]: " + error.stack);
              reject(error);
            }
            resolve();
          }
        );
      });

      // Megvárjuk, hogy az összes adatbázis művelet befejeződjön
      await Promise.all([insertEvent, insertPerformers, insertLocations]);

      connectionst getLastEventId = () => {
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
      connectionst getLastPerformerId = () => {
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
      connectionst insertEventsPerformers = async () => {
        try {
          connectionst lastEventId = await getLastEventId();
          connectionst lastPerformerId = await getLastPerformerId();
          connectionst query ="INSERT INTO events_perfomers (performs_id, events_id) VALUES (?, ?);";

          connectionst values = [lastPerformerId,lastEventId, ];
          connection.query(query, values, (error, results) => {
            if (error) {
              connectionsole.error(
                "Hiba történt az adatok felvitele során [events_perfomers >< ]:" + error.stack
              );
              return;
            }
            // connectionsole.log("Sikeres adatfelvitel az events_perfomers kapcsolótáblába!");
          });
        } catch (error) {
          connectionsole.error("Hiba az utolsó ID feltöltése során!" + error.stack);
        }
      };

      insertEventsPerformers();
      res.redirect("/adminpage");

    } catch (e) {
      connectionsole.log(e);
      res.redirect("/adminpage");
    }
  };
}


// ÚJ ADMINISZTRÁTOR RÖGZÍTÉSE
function AddNewAdmin(connection, fs) {
  return async (req, res) => {
    connectionst password = req.body.password;
    connectionst password2 = req.body.password_match;
    if (password == password2) {
      try {
        // Email ellenőrzése
        connection.query(`SELECT * FROM users WHERE email="${req.body.email}"`, async (error, results) => {
          if (error) {
            connectionsole.error('Hiba a regisztráció során: ' + error.stack);
            return res.redirect("/");
          }
          if (results.length > 0) {
            res.locals.message = "Az e-mail cím már használatban van!";
            return res.redirect("/");
          }
          // Ha az e-mail cím még nem szerepel az adatbázisban, akkor a felhasználói adatokat hozzáadjuk
          connectionst hashedPassword = await bcrypt.hash(req.body.password, 10);
          connection.query(`INSERT INTO users (name, email, password, nationality, gender, birthdate, permission) VALUES (
            "${req.body.name}", 
            "${req.body.email}", 
            "${hashedPassword}", 
            "${req.body.citizenship}", 
            "${req.body.gender}", 
            "${req.body.birthday}", 
            "admin"
          )`, (error) => {
            if (error) {
              connectionsole.error('Hiba a regisztráció során: ' + error.stack);
              return res.redirect("/");
            }
            // connectionsole.log('Sikeresen hozzáadta az admin-t!');
            res.redirect("/");
          });
        });
        
      } catch (e) {
        connectionsole.log(e);
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
  connection.query(`SELECT * FROM users_events WHERE events_id=${id};`, (error, result) => {
    if (error) throw error;

  // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM users_events WHERE events_id = ${id};`, (error, result) => {
      if (error) throw error;
      // connectionsole.log(`A(z) ${id} azonosítójú rekord törölve lett az users_events táblából.`);
    });
  });

  // 2. LÉPÉS: Kapcsolótáblából+Performers való törlés
  connection.query(`SELECT performs_id FROM events_perfomers WHERE events_id=${id};`, (error, result) => {
    if (error) throw error;

   // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM events_perfomers WHERE performs_id = ${result[0].performs_id};`, (error, result) => {
      if (error) throw error;
      // connectionsole.log(`A(z) ${result[0].performs_id} azonosítójú rekord törölve lett az events_perfomers táblából.`);
    });

    // Az events_perfomers táblából történő törlés
    connection.query(`DELETE FROM performers WHERE id = ${result[0].performs_id};`, (error, result) => {
      if (error) throw error;
      // connectionsole.log(`A(z) ${result[0].performs_id} azonosítójú rekord törölve lett az performs táblából.`);
    });

    // 3. LÉPÉS: Esemény + Esemény helyszín törlés
    connection.query(`SELECT loc_id FROM eventproperties WHERE id=${id};`, (error, result) => {
      if (error) throw error;

    // Az events_perfomers táblából történő törlés
      connection.query(`DELETE FROM eventproperties WHERE loc_id = ${result[0].loc_id};`, (error, result) => {
        if (error) throw error;
        // connectionsole.log(`A(z) ${result[0].loc_id} azonosítójú rekord törölve lett az eventproperties táblából.`);
      });

      // Az events_perfomers táblából történő törlés
      connection.query(`DELETE FROM locations WHERE id = ${result[0].loc_id};`, (error, result) => {
        if (error) throw error;
        // connectionsole.log(`A(z) ${result[0].loc_id} azonosítójú rekord törölve lett az locations táblából.`);
      });
    });
  });
}

module.exports = {AddNewEvent,AddNewAdmin,deleteEvent};
