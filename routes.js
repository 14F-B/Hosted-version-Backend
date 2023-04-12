const router = require('express').Router();
const passport = require("passport");
const bcrypt = require('bcrypt')


// Config
// Adatbázis kapcsolat
const connection = require('./Config/database');


// Middlewares
// API-s oldalak hozzáférése
const restriction = require('./Middlewares/restriction');

// EJS oldalak elérhetősége
const checkAuthenticated = require('./Middlewares/checkAuthenticated');
const checkNotAuthenticated = require('./Middlewares/checkNotAuthenticated');


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


// ================================================================================//
// ================================ EJS KISZOLGÁLÁS ==============================//
// ==============================================================================//
router.get("/",async(req, res) => {
  // try {
  //     const eventArray = await AllEvents();
      res.send("GO EVENT! - Backend server")
  //     res.render("pages/HomeView", {islogin: req.isAuthenticated(),eventArray}, 
  //     );

  // } catch (error) {
  //   console.log(error);
  //   res.send('Hiba az adatok letöltése során! (Adatbázis hiba)');
  // }
 });
// Adminisztrációs felület  (GET)
router.get("/adminpage", checkAuthenticated, async (req, res) => {
  try {
    const eventArray = await AllEvents();
    const usersArray = await getUsers();
    res.render("pages/AdminPage", {
      title: "Adminisztráció",
      islogin: req.isAuthenticated(),
      isAdmin: req.user.permission,
      eventArray, usersArray
      
    });
  } catch (error) {
    console.log(error);
    res.send('Hiba az adatok letöltése során! (Adatbázis hiba)');
  }
});


// Felhasználói fiók  (GET)
router.get("/userpage",checkAuthenticated,async (req, res) => {
  const formattedDate = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short' }).format(new Date(req.user.birthdate)); // Dátum formázása magyar formátumra
  const appliedEvents =await getAppliedEvents(req.user.id)
  res.render("pages/UserPage", {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    citizenship: req.user.nationality,
    birthday: formattedDate,
    gender: req.user.gender,
    isAdmin: req.user.permission,
    islogin: req.isAuthenticated(),
    appliedEvents,
  });
});

// Adatvédelmi oldal  (GET)
router.get("/adatvedelem", (req, res) => {
  res.render("pages/Adatvedelem", { title: "Adatvédelem", islogin: req.isAuthenticated()});
});

// Bejelentkezéshez szükséges aloldalak  (GET)
router.get("/signup", checkNotAuthenticated, (req, res) => {
  res.render("pages/HomeView", { title: "GO EVENT! - Home" ,islogin: req.isAuthenticated()});
});


// Új adminisztrátor rögzítése  (GET)
router.get("/newadmin", checkAuthenticated, (req, res) => {
  res.render("pages/AdminPage", { title: "GO EVENT! - Adminisztráció",islogin: req.isAuthenticated() });
});

// API Dokumentáció  (GET)
router.get("/docs", (req, res) => {
  res.render("pages/api_docs", { title: "GO EVENT! - API Service" });
});


// Bejelentkezés az alkalmazásba  (POST)
router.post("/login",checkNotAuthenticated,
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
    failureFlash: true,
  })
);


router.post("/signup", checkNotAuthenticated, signUp(connection));   // Általános hozzáférésű regisztráció  (POST)
router.post("/newadmin", checkAuthenticated,  AddNewAdmin(connection));  // Adminisztráció: Új admin hozzáadása  (POST)
router.post("/addevent",   checkAuthenticated, AddNewEvent(connection)); // Adminisztráció: Esemény létrehozása  (POST)

// Hírlevél tartalmának továbbítása emailben  (POST)
router.post("/", (req, res, ) => { 
  contactForm(req.body.senderName, req.body.senderEmail, req.body.subject, req.body.message);
  res.redirect("/#contact")
});


// Események és felhasználók törlése adatbázisból  (POST)
router.post('/eventdelete', (req, res) => { 
  deleteEvent(req.body.id)

  res.redirect('/AdminPage');
});

// Fiók törlése admin felületről  (POST)
router.post('/deleteuser', (req, res) => {
  deleteUserById(req.body.id);

  res.redirect('/AdminPage');
});

// Fiók törlése UserPage oldalon (Csak user joggal rendelkezőknek!)  (POST)
router.post('/deleteAccount', (req, res) => {
  deleteUserById(req.body.id);
  req.logout(req.user, (err) => {
    if (err) return next(err);
  
  res.redirect('/');
  
});
})

// Jelszó frissítése UserPage oldalon  (POST)
router.post('/refreshPassword', (req, res) => {
  changePassword(req.user.id, req.body.password_old, req.body.password_new, req.body.password_new_match,callbackPromise);
  res.redirect('/UserPage'); 
});

// Elfelejtett jelszó (Új jelszó igénylése)  (POST)
router.post('/forgotPassword', (req, res) => {
  forgotPassword(req.body.email); 
  res.redirect('/'); 
});

// Jelentkezés egy eseményre  (POST)
router.post('/applyToLocation', (req, res) => {
  const mergedata = req.body.locationId.split(";");;
  const locationId = parseInt(mergedata[0])
  const userAge= Math.round((new Date(mergedata[2])-new Date(req.user.birthdate)) / (1000 * 60 * 60 * 24 * 365.25));
  const eventAge= parseInt(mergedata[3]);
  const eventId= parseInt(mergedata[1])

  applyToLocation(locationId,req.user.id,eventId,userAge,eventAge,req.user.email); 
  res.redirect('/#actually');
  
});

// Jelentkezés visszamondása  (POST)
router.post('/cancelApplication', (req, res) => {
  const mergedata = req.body.locationId.split(";");;
  const locationId = parseInt(mergedata[0])
  const eventId= parseInt(mergedata[1])

  cancelApplication(locationId,req.user.id,eventId,req.user.email); 
  res.redirect('/#actually'); 
});


// Kijelentkezés  (DELETE)
router.delete("/logout", (req, res) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});





// ===================================================================================//
// ================================= API REQUESTS ===================================//
// =================================================================================//

// Következő esemény  (GET)
router.get('/docs/nextevent', (req, res) => {
  NextEventContent((error, results) => {
    if (error) {return res.status(500).json({ error: 'Adatbázis hiba!' });}
    res.type('json').send(JSON.stringify(results, null, 2));    
  });
});


// Összes jövőbeli esemény  (GET)
router.get('/docs/allevents',  (req, res) => {
  AllEvents()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));})
  .catch((error) => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)'+(error));});
});


// Összes felhasználó adata  (GET)
router.get('/docs/allusers',restriction, (req, res) => {
  getUsers()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));       })
  .catch((error) => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)'+(error));});
});


// Események kategóriánként  (GET)
router.get('/docs/eventcategory/:categories', function(req, res) {
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
router.get('/docs/userapplied/:user_id',restriction, function(req, res) {
  getAppliedEvents(req.params.user_id)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));})
    .catch(error => {res.status(500).send(error);});
});


// Esemény személy ellenőrzése  (GET)
router.get('/docs/eventpass/:pass_code',restriction, function(req, res) {
  eventPass(req.params.pass_code)
    .then(results => {res.type('json').send(JSON.stringify(results, null, 2));})
    .catch(error => {res.status(500).send(error);});
});


// Események archívuma  (GET)
router.get('/docs/archive', (req, res) => {
  ArchivedEvents()
  .then((results) => {res.type('json').send(JSON.stringify(results, null, 2));})
  .catch(error => {res.status(500).send('Hiba az adatok letöltése során! (Adatbázis hiba)\n'+(error));});
});


// Új esemény létrehozása (POST)
router.post("/docs/newevent",restriction, async (req, res, next) => {
  await AddNewEvent(connection)(req, res);
});
// Regisztráció  (POST)
router.post("/docs/signup", async (req, res, next) => {
  await signUp(connection)(req, res);
});

// Admin regisztráció  (POST)
router.post("/docs/newadmin",restriction, async (req, res, next) => {
  await AddNewAdmin(connection)(req, res);
});



// Főoldali kapcsolati űrlap adatainak küldése   (POST)
router.post('/docs/sendForm', (req, res) => {
  contactForm(req.body.senderName, req.body.senderEmail, req.body.subject, req.body.message);
})



// Bejelentkezés  (POST)
router.post('/docs/login',restriction, (req, res) => {
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
router.post('/docs/applyToLocation',restriction, (req, res) => {
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
router.post('/docs/cancelApplication',restriction, (req, res) => {
  cancelApplication(req.body.locationId,req.body.userID,req.body.eventId,req.body.userEmail); 
});


// Elfelejtett jelszó  (PUT)
router.put("/docs/forgotpassword",restriction, async (req, res, next) => {
  await forgotPassword(req.body.email);(req, res);
});


// Jelszó frissítése  (PUT)
router.put('/docs/refreshPassword',restriction, (req, res) => {
  changePassword(req.body.id, req.body.password_old, req.body.password_new, req.body.password_new_match, callbackPromise)
})


// Esemény törlése ID alapján  (DELETE)
router.delete("/docs/deleteEvent/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  if (deleteEvent(id)) {res.send(`A(z) ${req.params.id} azonosítójú esemény törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${req.params.id} azonosítójú esemény.`);}
});


// User törlése ID alapján (DELETE)
router.delete("/docs/deleteUser/:id",restriction,(req, res,next) => {
  const id = req.params.id;
  if (deleteUserById(id)) {res.send(`A(z) ${id} azonosítójú felhasználó törölve lett az adatbázisból.`);} 
  else {res.status(404).send(`Nem található ${id} azonosítójú felhasználó.`);}
});


module.exports = router;