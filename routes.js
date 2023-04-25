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
router.post("/newevent", restriction, async (req, res, next) => {
  try {
    await AddNewEvent(connection)(req, res);
    res.status(200).send("Az esemény sikeresen hozzáadva!"); 
  } catch (error) {
    res.status(503).send("Szerver hiba történt.");
  }
});
// Regisztráció  (POST)
router.post("/signup", async (req, res, next) => {
    await signUp(connection)(req, res);
});



// Admin regisztráció  (POST)
router.post("/newadmin",restriction, async (req, res, next) => {
    try {
      await AddNewAdmin(connection)(req, res);
      res.status(200).send("Sikeresen hozzáadta az adminisztrátor!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
    } catch (error) {
      res.status(500).send("Hiba történt a rögzítés során"); // Visszaküld 500-as státuszkóddal és hibás üzenettel
    }
});



// Főoldali kapcsolati űrlap adatainak küldése   (POST)
router.post('/sendForm', async (req, res) => {
  try {
    await contactForm(req.body.senderName, req.body.senderEmail, req.body.subject, req.body.message);
    res.status(200).send("Az űrlap sikeresen elküldve!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    res.status(500).send("Szerver hiba történt."); // Visszaküld 500-as státuszkóddal és hibás üzenettel
  }
});




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
router.post('/cancelApplication', restriction, async (req, res) => {
  try {
    await cancelApplication(req.body.locationId, req.body.userID, req.body.eventId, req.body.userEmail);
    res.status(200).send("Sikeresen visszavontad a jelentkezést!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    res.status(503).send("Szerver hiba történt."); // Visszaküld 503-as státuszkóddal és hibás üzenettel
  }
});


// Elfelejtett jelszó  (PUT)
router.put("/forgotpassword",restriction, async (req, res) => {
  try {
    res.status(200).send("Az új jelszó elküldve az e-mail címre!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).send("Hibás kérés."); // Visszaküld 400-as státuszkóddal és hibás üzenettel
    } else {
      res.status(500).send("Szerver hiba történt."); // Visszaküld 500-as státuszkóddal és hibás üzenettel
    }
  }
  console.log(req.body.email)
});


// Jelszó frissítése  (PUT)
router.put('/refreshPassword', restriction, async (req, res) => {
  try {
    await changePassword(req.body.id, req.body.password_old, req.body.password_new, req.body.password_new_match, callbackPromise);
    res.status(200).send("A jelszó sikeresen frissítve!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    res.status(500).send("Szerver hiba történt."); // Visszaküld 500-as státuszkóddal és hibás üzenettel
  }
});



// Esemény törlése ID alapján  (DELETE)
router.delete("/deleteEvent/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  deleteEvent(id)
});


// User törlése ID alapján (DELETE)
router.delete("/deleteUser/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  deleteUserById(id)
});


module.exports = router;