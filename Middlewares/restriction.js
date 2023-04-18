// Külsős alkalmazások engedélyzése
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173',"https://goeventhungary.netlify.app",'http://localhost:5172','https://goeventdev.netlify.app','https://goeventapiservice.cyclic.app'];

module.exports = (req, res, next) => {
  if(allowedOrigins.includes(req.headers.origin)) {
    return next();
  } else {
    return res.status(403).send('Hozzáférés megtagadva!');
  }
};