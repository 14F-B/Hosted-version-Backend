const connection = require("../Config/database");

// KÖVETKEZŐ ESEMÉNY

function NextEventContent(callback) {
  connection.query(
    "SELECT name, date,city, street,house_number FROM eventproperties INNER JOIN locations ON eventproperties.loc_id = locations.id  WHERE date > NOW() ORDER BY date ASC LIMIT 1;",
    function (error, results) {
      if (error) {
        return callback(error);
      }
      return callback(null, results);
    }
  );
}

// ÖSSZES ESEMÉNY KILISTÁZÁSA
function AllEvents() {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.id, eventproperties.name, eventproperties.date,DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date, eventproperties.agelimit, eventproperties.url_link, eventproperties.description,
       eventproperties.loc_id, locations.city, locations.street, locations.house_number, 
       locations.capacity, locations.applied, performers.name as performer_name 
       FROM eventproperties JOIN locations ON eventproperties.loc_id = locations.id 
       JOIN events_perfomers ON eventproperties.id = events_perfomers.events_id 
       JOIN performers ON events_perfomers.performs_id = performers.id 
       WHERE eventproperties.date > NOW() ORDER BY eventproperties.date ASC;`,
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          const parsedResults = JSON.parse(JSON.stringify(results));
          resolve(parsedResults);
        }
      }
    );
  });
}

// KATEGÓRIÁNKÉNTI LISTA
function eventsByCategories(category) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.id, eventproperties.name, eventproperties.date,DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date, eventproperties.agelimit, eventproperties.url_link, eventproperties.description,
      eventproperties.loc_id, locations.city, locations.street, locations.house_number, 
      locations.capacity, locations.applied, performers.name as performer_name 
      FROM eventproperties JOIN locations ON eventproperties.loc_id = locations.id 
      JOIN events_perfomers ON eventproperties.id = events_perfomers.events_id 
      JOIN performers ON events_perfomers.performs_id = performers.id 
      WHERE eventproperties.date > NOW() AND eventproperties.Category = ? 
      ORDER BY eventproperties.date ASC;`,
      [category],
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          const parsedResults = JSON.parse(JSON.stringify(results));
          resolve(parsedResults);
        }
      }
    );
  });
}

// ESEMÉNYEK KORHATÁR SZERINT (0,12,16,18)
function eventsByAge(agelimit) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.id, eventproperties.name, eventproperties.date,DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date, eventproperties.agelimit, eventproperties.url_link, eventproperties.description,
      eventproperties.loc_id, locations.city, locations.street, locations.house_number, 
      locations.capacity, locations.applied, performers.name as performer_name 
      FROM eventproperties JOIN locations ON eventproperties.loc_id = locations.id 
      JOIN events_perfomers ON eventproperties.id = events_perfomers.events_id 
      JOIN performers ON events_perfomers.performs_id = performers.id 
      WHERE eventproperties.date > NOW() AND eventproperties.agelimit = ? 
      ORDER BY eventproperties.date ASC;`,
      [agelimit],
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          const parsedResults = JSON.parse(JSON.stringify(results));
          resolve(parsedResults);
        }
      }
    );
  });
}

// ESEMÉNY: QR KÓD ÉRVÉNYESSÉG
function eventPass(pass_code) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.name AS event_name, DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS event_date, users.name AS user_name,
       DATE_FORMAT(users.birthdate, '%Y.%m.%d') AS user_birhdate , users_events.event_pass_code AS user_pass
       FROM users_events
       JOIN eventproperties ON users_events.events_id = eventproperties.id
       JOIN users ON users_events.users_id = users.id
       WHERE users_events.event_pass_code = ?`,
      [pass_code],
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          const parsedResults = JSON.parse(JSON.stringify(results));
          resolve(parsedResults);
        }
      }
    );
  });
}

// ARCHÍVÁLT ESEMÉNYEK (KORÁBBIAK)
function ArchivedEvents() {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.id, eventproperties.name, eventproperties.date,DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date, eventproperties.agelimit, eventproperties.url_link, eventproperties.description,
      eventproperties.loc_id, locations.city, locations.street, locations.house_number, 
      locations.capacity, locations.applied, performers.name as performer_name 
      FROM eventproperties JOIN locations ON eventproperties.loc_id = locations.id 
      JOIN events_perfomers ON eventproperties.id = events_perfomers.events_id 
      JOIN performers ON events_perfomers.performs_id = performers.id WHERE eventproperties.date < NOW() ORDER BY eventproperties.date ASC;`,
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          const parsedResults = JSON.parse(JSON.stringify(results));
          resolve(parsedResults);
        }
      }
    );
  });
  
}

// ÖSSZES FELHASZNÁLÓ
function getUsers() {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM users;", function (error, results) {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });  
}

// FELHASZNÁLÓ KÖVETKEZŐ ESEMÉNYEI
function getAppliedEvents(id) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT eventproperties.id, eventproperties.name, eventproperties.loc_id, locations.city, locations.street, locations.house_number, DATE_FORMAT(eventproperties.date, '%Y.%m.%d %H:%i') AS formatted_date 
                      FROM users_events 
                      INNER JOIN eventproperties ON users_events.events_id = eventproperties.id 
                      INNER JOIN locations ON eventproperties.loc_id = locations.id 
                      WHERE users_events.users_id = ? AND eventproperties.date > NOW() 
                      ORDER BY eventproperties.date`,
      [parseInt(id)],
      function (error, results) {
        if (error) {
          reject(error);
        } else {
          resolve(JSON.parse(JSON.stringify(results)));
        }
      }
    );
  });
}

module.exports = {
  NextEventContent,
  AllEvents,
  getUsers,
  ArchivedEvents,
  eventsByCategories,
  eventsByAge,
  eventPass,
  getAppliedEvents,
};
