// Ez a Middleware az EJS-ről érkező kéréseket vizsgálja, 
// és csak azokra a route-okra enged, amit csak akkor lehet 
// látogatni, ha a felhasználó be van jelentkezve.


module.exports = (req, res, next) => {
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect("/")
  };