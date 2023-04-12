const router = require('express').Router();
const bcrypt = require('bcrypt')


// Config
// Adatbázis kapcsolat
const connection = require('./Config/database');


// Middlewares
// API-s oldalak hozzáférése
const restriction = require('./Middlewares/restriction');



// Controllers
// API hívások
const { AllEvents, getUsers, getAppliedEvents, ArchivedEvents,
        NextEventContent, eventsByCategories,eventsByAge,eventPass} = require('./Controllers/queryController');

//Bejelentkezés és regisztrációs folyamatok
const {signUp,forgotPassword,changePassword } = require("./Controllers/authController"); 

//Adminisztrációs folyamatok
const {AddNewEvent,AddNewAdmin,deleteEvent } = require("./Controllers/adminController");

//Felhasználói folyamatok
const { deleteUserById,applyToLocation, cancelApplication, contactForm } = require('./Controllers/userController');

//Callback
const { callbackPromise } = require("nodemailer/lib/shared");
const { log } = require("async");




// Következő esemény  (GET)
router.get('/nextevent', (req, res) => {
  NextEventContent((error, results) => {
    if (error) {return res.status(500).json({ error: 'Adatbázis hiba!' });}
    res.type('json').send(JSON.stringify(results, null, 2));    
  });
});


// Összes jövőbeli esemény  (GET)
router.get('/allevents',  (req, res) => {
  AllEvents()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));})
  .catch((error) => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)'+(error));});
});


// Összes felhasználó adata  (GET)
router.get('/allusers',restriction, (req, res) => {
  getUsers()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));       })
  .catch((error) => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)'+(error));});
});


// Események kategóriánként  (GET)
router.get('/eventcategory/:categories', function(req, res) {
  eventsByCategories(req.params.categories)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));    })
    .catch(error => {res.status(500).send(error);});
});


// Események korhatár szerint  (GET)
router.get('/eventagelimit/:agelimit', function(req, res) {
  eventsByAge(req.params.agelimit)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));    
    })
    .catch(error => {res.status(500).send(error);});
});


// Felhasználó regisztrált eseményei id alapján  (GET)
router.get('/userapplied/:user_id',restriction, function(req, res) {
  getAppliedEvents(req.params.user_id)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));})
    .catch(error => {res.status(500).send(error);});
});


// Esemény személy ellenőrzése  (GET)
router.get('/eventpass/:pass_code',restriction, function(req, res) {
  eventPass(req.params.pass_code)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));})
    .catch(error => {res.status(500).send(error);});
});


// Események archívuma  (GET)
router.get('/archive', (req, res) => {
  ArchivedEvents()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));})
  .catch(error => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)\n'+(error));});
});


// Új esemény létrehozása (POST)
router.post("/newevent",restriction, async (req, res, next) => {
  await AddNewEvent(connection)(req, res);
});
// Regisztráció  (POST)
router.post("/signup", async (req, res, next) => {
  await signUp(connection)(req, res);
});

// Admin regisztráció  (POST)
router.post("/newadmin",restriction, async (req, res, next) => {
  await AddNewAdmin(connection)(req, res);
});



// Főoldali kapcsolati űrlap adatainak küldése   (POST)
router.post('/sendForm', (req, res) => {
  contactForm(req.body.senderName, req.body.senderEmail, req.body.subject, req.body.message);
})



// Bejelentkezés  (POST)
router.post('/login',restriction, (req, res) => {
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
});

// Eseményre való jelentkezés
router.post('/applyToLocation',restriction, (req, res) => {
  // Felhasználó életkorának kiszámítása
  const userAge = Math.round((new Date(req.body.eventDate)-new Date(req.body.userBirthday)) / (1000 * 60 * 60 * 24 * 365.25));

  // Életkor vizsgálata
  if (userAge < req.body.agelimit) {
    return res.status(400).json({ message: "Nem vagy elég idős az eseményre való jelentkezéshez." });
  }
  applyToLocation(req.body.locationId, req.body.userId, req.body.eventId, userAge, req.body.agelimit, req.body.userEmail); 
  res.status(200).json({ message: "Sikeres jelentkezés!" });
  
});

// Jelentkezés visszamondása
router.post('/cancelApplication',restriction, (req, res) => {
  cancelApplication(req.body.locationId,req.body.userID,req.body.eventId,req.body.userEmail); 
});


// Elfelejtett jelszó  (PUT)
router.put("/forgotpassword",restriction, async (req, res, next) => {
  await forgotPassword(req.body.email);(req, res);
});


// Jelszó frissítése  (PUT)
router.put('/refreshPassword',restriction, (req, res) => {
  changePassword(req.body.id, req.body.password_old, req.body.password_new, req.body.password_new_match, callbackPromise)
})


// Esemény törlése ID alapján  (DELETE)
router.delete("/deleteEvent/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  if (deleteEvent(id)) {res.send(`A(z) ${req.params.id} azonosítójú esemény törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${req.params.id} azonosítójú esemény.`);}
});


// User törlése ID alapján (DELETE)
router.delete("/deleteUser/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  if (deleteUserById(id)) {res.send(`A(z) ${id} azonosítójú felhasználó törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${id} azonosítójú felhasználó.`);}
});


module.exports = router;