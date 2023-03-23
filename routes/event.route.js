module.exports = (app) =>{
    const router = require('express').Router();
    const events = require('../controllers/event.controller');



    router.get('/',events.getAll);
    app.use('/api/event',router);

    router.get('/event',events.getAll);
    router.get('/properties',events.getProperties);
    app.use('/api',router);
}

const router = express.Router();



// API hívások
const { AllEvents, getUsers, getAppliedEvents, ArchivedEvents,
        NextEventContent, eventsByCategories,eventsByAge,eventPass} = require('../controllers/queries');

const {deleteEvent} = require("../controllers/admin_process");
const {deleteUserById} = require("../controllers/user_process");

// Következő esemény  (GET)
router.get('/nextevent', (req, res) => {
  NextEventContent((error, results) => {
    if (error) {return res.status(500).json({ error: 'Adatbázis hiba!' });}
    res.type('json').send(JSON.stringify(results, null, 2));    
  });
});


// Összes jövőbeli esemény  (GET)
router.get('/allevents', (req, res) => {
  AllEvents()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));})
  .catch((error) => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)'+(error));});
});


// Összes felhasználó adata  (GET)
router.get('/allusers', (req, res) => {
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
router.get('/userapplied/:user_id', function(req, res) {
  getAppliedEvents(req.params.user_id)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));})
    .catch(error => {res.status(500).send(error);});
});


// Esemény személy ellenőrzése  (GET)
router.get('/eventpass/:pass_code', function(req, res) {
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


// Új esemény létrehozása URL paraméterrel  (POST) INAKTÍV!!!
router.get("/newevent/:eventName&:eventDescription&:eventImgURL&:eventAge&:eventDay&:eventCategory",(req, res,next) => {

});


// Esemény törlése ID alapján  (DELETE)
router.get("/deleteEvent/:id",(req, res,next) => {
  if (deleteEvent(req.params.id)) {res.send(`A(z) ${req.params.id} azonosítójú esemény törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${req.params.id} azonosítójú esemény.`);}
});


// User törlése ID alapján  (DELETE)
router.get("/deleteUser/:id",(req, res,next) => {
  if (deleteUserById(req.params.id)) {res.send(`A(z) ${req.params.id} azonosítójú felhasználó törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${req.params.id} azonosítójú felhasználó.`);}
});



