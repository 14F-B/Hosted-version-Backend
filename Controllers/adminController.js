const bcrypt = require('bcrypt');
const connection = require('../Config/database')

// ÚJ ESEMÉNY LÉTREHOZÁSA
function AddNewEvent(connection) {
  return async (req, res) => {
    try {
      const eventAge = getEventAge(req.body.eventAgelimit);
      await insertLocationData(connection, req);
      await insertEventData(connection, req, eventAge);
      await insertPerformerData(connection, req);
      await insertEventsPerformers(connection,req);
    } catch (e) {
      console.log(e);
    }
  };
}

function getEventAge(ageLimit) {
  const ageLimitsMap = {
    "Korhatár nélküli": 0,
    "12+": 12,
    "16+": 16,
    "18+": 18
  };
  return ageLimitsMap[ageLimit] || 0;
}

function getMaxLocId(connection) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT MAX(id) AS maxId FROM locations",
      function (err, results) {
        if (err) {
          console.error("Error retrieving max location id: " + err.stack);
          reject(err);
        } else {
          const maxLocId = results[0].maxId; // az utolsó id érték
          resolve(maxLocId);
        }
      }
    );
  });
}
function insertEventData(connection, req, eventAge) {
  return new Promise((resolve, reject) => {
    getMaxLocId(connection).then(maxLocId => {
      const query = "INSERT INTO eventproperties (name, description, url_link, agelimit, date, category, loc_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const values = [req.body.eventName, req.body.eventDescription, req.body.eventImgURL, parseInt(eventAge), req.body.eventDay, req.body.eventCategory, maxLocId];
      connection.query(query, values, function (err) {
        if (err) {
          console.error("Hiba történt az adatok felvitele során [eventproperties]: " + err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    }).catch(err => {
      console.error("Hiba történt az adatok felvitele során [locations]: " + err.stack);
      reject(err);
    });
  });
}



function insertPerformerData(connection, req) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO performers (name) VALUES (?)";
    const values = req.body.eventPerformers;
    connection.query(query, values, function (err) {
      if (err) {
        console.error("Hiba történt az adatok felvitele során [performers]: " + err.stack);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


function insertLocationData(connection, req) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO locations (city, street, house_number, capacity) VALUES (?,?,?,?)";
    const values = [req.body.eventCity, req.body.eventStreet, req.body.eventHno, req.body.eventCapacity];
    connection.query(query, values, function (err) {
      if (err) {
        console.error("Hiba történt az adatok felvitele során [locations]: " + err.stack);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getLastId(connection, table) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT MAX(id) AS id FROM ${table}`,
      function (err, results) {
        if (err) {
          console.error("Error retrieving max location id: " + err.stack);
          reject(err);
        } else {
          resolve(parseInt(results[0].id));
        }
      }
    );
  });
}

function insertEventsPerformers(connection, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const lastEventId = await getLastId(connection, "eventproperties");
      const lastPerformerId = await getLastId(connection, "performers");
      const query = "INSERT INTO events_perfomers (performs_id, events_id) VALUES (?, ?);";
      const values = [lastPerformerId, lastEventId, req.body.eventPerformers];
      connection.query(query, values, function (error) {
        if (error) {
          console.error("Hiba történt az adatok felvitele során [events_perfomers]: " + error.stack);
          reject(error);
        } else {
          resolve();
        }
      });
      // Megvárjuk, hogy az összes adatbázis művelet befejeződjön
      await Promise.all([insertEventData(connection), insertPerformerData(connection, req), insertLocationData(connection)]);
    } catch (error) {
      console.error("Hiba történt az adatok felvitele során: " + error.stack);
      reject(error);
    }
  });
}






// ÚJ ADMINISZTRÁTOR RÖGZÍTÉSE
function AddNewAdmin(connection) {
  return async (req, res) => {
    if (req.body.password == req.body.password_match) {
      try {
        // Email ellenőrzése
        connection.query('SELECT * FROM users WHERE email = ?', [req.body.email], async (err, results) => {
          if (err) {
            console.error('Hiba a regisztráció során: ' + err.stack);
            return res.status(500).send({message: "Adatbázis kapcsolat megszakadt" });
          }
          if (results.length > 0) {
            res.locals.message = "Az e-mail cím már használatban van!";
            return res.status(409).send({ message: "Az e-mail cím már használatban van!" });
          }
          // Ha az e-mail cím még nem szerepel az adatbázisban, akkor a felhasználói adatokat hozzáadjuk
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          connection.query('INSERT INTO users (name, email, password, nationality, gender, birthdate, permission) VALUES (?, ?, ?, ?, ?, ?, "admin")', 
          [req.body.name, req.body.email, hashedPassword, req.body.citizenship, req.body.gender, req.body.birthday], (err) => {
            if (err) {
              console.error('Hiba a regisztráció során: ' + err.stack);
              return res.status(500).send({ message: "Adatbázis kapcsolat megszakadt" });
            }
            // console.log('Sikeresen regisztráció');
            return res.status(200).send({ message: "Sikeresen hozzáadta az adminisztrátor!" });
          });
        });
        
      } catch (e) {
        console.log(e);
        return res.status(500).send({message: "Adatbázis kapcsolat megszakadt" });
      }
    } else {
      return res.status(400).send({message: "A két jelszó nem egyezik!" });
    }
  };
}







// ESEMÉNY TÖRLÉSE
function deleteEvent(id) {
  return new Promise((resolve, reject) => {
    connection.query(`SELECT * FROM users_events WHERE events_id=${id};`, async (err, result) => {
      if (err) {
        reject('Szerverhiba: Nem sikerült lekérni az users_events táblából.');
        return;
      }

      try {
        await deleteFromTable('users_events', `events_id = ${id}`);
        const performsIdResult = await queryTable('events_perfomers', 'performs_id', `events_id=${id}`);
        const performsId = performsIdResult[0].performs_id;
        await deleteFromTable('events_perfomers', `performs_id = ${performsId}`);
        await deleteFromTable('performers', `id = ${performsId}`);
        const locIdResult = await queryTable('eventproperties', 'loc_id', `id=${id}`);
        const locId = locIdResult[0].loc_id;
        await deleteFromTable('eventproperties', `loc_id = ${locId}`);
        await deleteFromTable('locations', `id = ${locId}`);
        await deleteFromTable('events', `id = ${id}`);
        resolve('Sikeresen törölve.');
      } catch (error) {
        reject(error);
      }
    });
  });
}

function queryTable(table, columns, conditions) {
  return new Promise((resolve, reject) => {
    connection.query(`SELECT ${columns} FROM ${table} WHERE ${conditions}`, (err, result) => {
      if (err) {
        reject(`Szerverhiba: Nem sikerült lekérni a(z) ${table} táblából.`);
      } else {
        resolve(result);
      }
    });
  });
}

function deleteFromTable(table, conditions) {
  return new Promise((resolve, reject) => {
    connection.query(`DELETE FROM ${table} WHERE ${conditions}`, (err, result) => {
      if (err) {
        reject(`Szerverhiba: Nem sikerült törölni a(z) ${table} táblából.`);
      } else {
        resolve();
      }
    });
  });
}



module.exports = { AddNewEvent, AddNewAdmin, deleteEvent };
