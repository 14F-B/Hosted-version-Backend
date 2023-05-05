const router = require('express').Router();


// Adatbázis kapcsolat definiálása
const connection = require('./Config/database');


// API-s oldalak hozzáférése (Middleware)
const restriction = require('./Middlewares/restriction');
const checkAuthenticated = require('./Middlewares/checkAuthenticated');




// Controllers
// API hívások
const { AllEvents, getUsers, getAppliedEvents, ArchivedEvents,
        NextEventContent, eventsByCategories, eventsByAge, eventPass } = require('./Controllers/queryController');

//Bejelentkezés és regisztrációs folyamatok
const { signUp,login, forgotPassword, changePassword } = require("./Controllers/authController");

//Adminisztrációs folyamatok
const { AddNewEvent, AddNewAdmin, deleteEvent } = require("./Controllers/adminController");

//Felhasználói folyamatok
const { deleteUserById, applyToLocation, cancelApplication, contactForm } = require('./Controllers/userController');


/****************************************************************************
************************* G e t   r e q u e s t s ***************************
****************************************************************************/

// Következő esemény
router.get('/nextevent', (req, res) => {
  NextEventContent()
    .then((results) => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch((error) => { res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)' + (error)); });
});

// Összes jövőbeli esemény
router.get('/allevents', (req, res) => {
  AllEvents()
    .then((results) => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch((error) => { res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)' + (error)); });
});


// Összes felhasználó adata
router.get('/allusers', restriction, checkAuthenticated,  (req, res) => {
  getUsers()
    .then((results) => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch((error) => { res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)' + (error)); });
});


// Események kategóriánként
router.get('/eventcategory/:categories', function (req, res) {
  eventsByCategories(req.params.categories)
    .then(results => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch(error => { res.status(500).send(error); });
});


// Események korhatár szerint
router.get('/eventagelimit/:agelimit', function (req, res) {
  eventsByAge(req.params.agelimit)
    .then(results => {
      res.type('json').send(JSON.stringify(results, null, 2));
    })
    .catch(error => { res.status(500).send(error); });
});


// Felhasználó regisztrált eseményei id alapján
router.get('/userapplied/:user_id', restriction,checkAuthenticated, function (req, res) {
  getAppliedEvents(req.params.user_id)
    .then(results => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch(error => { res.status(500).send(error); });
});


// Esemény személy ellenőrzése
router.get('/eventpass/:pass_code', restriction, async function (req, res) {
  try {
    const results = await eventPass(req.params.pass_code);
    if (results.length > 0) {
      res.type('json').send(JSON.stringify(results, null, 2));
    } else {
      res.status(404).send({ message: 'Érvénytelen belépési azonosító!' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Szerver hiba!' });
  }
});


// Események archívuma
router.get('/archive', (req, res) => {
  ArchivedEvents()
    .then((results) => { res.type('json').send(JSON.stringify(results, null, 2)); })
    .catch(error => { res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)\n' + (error)); });
});

/****************************************************************************
************************ P o s t   r e q u e s t s **************************
****************************************************************************/

// Autentikáció
router.post("/signup",  signUp(connection) );
router.post("/newadmin", restriction,checkAuthenticated, AddNewAdmin(connection));
router.post('/login', restriction ,login(connection));


// Új esemény létrehozása 
router.post("/newevent", restriction,checkAuthenticated, async (req, res, next) => {
  try {
    await AddNewEvent(connection)(req, res);
    res.status(200).send("Az esemény sikeresen hozzáadva!");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error", message: error.message });
  }
});




// Főoldali kapcsolati űrlap adatainak küldése
router.post('/sendForm', (req, res) => {
  try {
    contactForm(req.body.senderName, req.body.senderEmail, req.body.subject, req.body.message);
    res.status(200).send("Az űrlap sikeresen elküldve!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    res.status(500).send("Szerver hiba történt."); // Visszaküld 500-as státuszkóddal és hibás üzenettel
  }
});



// Eseményre való jelentkezés
router.post('/applyToLocation', restriction,checkAuthenticated, async (req, res) => {
  const result = await applyToLocation(req.body.locationId, req.body.userId, req.body.eventId, req.body.eventDate, req.body.agelimit,req.body.userBirthday, req.body.userEmail);
  res.status(result.statusCode).json({ message: result.message });
});

// Jelentkezés visszamondása
router.post('/cancelApplication', restriction,checkAuthenticated, async (req, res) => {
  try {
    await cancelApplication(req.body.locationId, req.body.userID, req.body.eventId, req.body.userEmail);
    res.status(200).send("Sikeresen visszavontad a jelentkezést!"); // Visszaküld 200-as státuszkóddal és sikeres üzenettel
  } catch (error) {
    res.status(503).send("Szerver hiba történt."); // Visszaküld 503-as státuszkóddal és hibás üzenettel
  }
});


/****************************************************************************
************************* P u t   r e q u e s t s ***************************
****************************************************************************/

// Elfelejtett jelszó
router.put('/forgotpassword', restriction, async (req, res) => {
  try {
    const result = await forgotPassword(req.body.email);
    res.status(200).send(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).send(error.message);
    } else {
      res.status(500).send('A jelszó módosítása sikertelen volt.');
    }
  }
});


// Jelszó frissítése
router.put('/refreshPassword', restriction,checkAuthenticated, async (req, res) => {
  try {
    const result = await changePassword(req.body.id, req.body.password_old, req.body.password_new, req.body.password_new_match);
    res.status(result.statusCode).json({ message: result.message });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode).json({ message: error.message });
  }
});


/****************************************************************************
********************* D e l  e t e   r e q u e s t s ************************
****************************************************************************/

// Esemény törlése ID alapján
router.delete('/deleteEvent/:id', restriction,checkAuthenticated, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await deleteEvent(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
});


// User törlése ID alapján
router.delete("/deleteUser/:id", restriction,checkAuthenticated, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await deleteUserById(id);
    res.status(result.status).send({ message: result.message });
  } catch (err) {
    res.status(err.status).send({ error: "Internal Server Error", message: err.message });
  }

});


module.exports = router;