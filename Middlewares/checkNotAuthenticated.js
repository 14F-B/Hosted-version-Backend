// Ez a Middleware az EJS-ről érkező kéréseket vizsgálja, 
// és csak azokra a route-okra enged, amit csak akkor lehet 
// látogatni, ha a felhasználó nincs bejelentkezve.

module.exports = (req, res, next) => {
    if(req.isAuthenticated()){
        return res.redirect("/")
        
    }
    next()
  };