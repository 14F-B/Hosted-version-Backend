// Külsős alkalmazások engedélyzése
const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173', 
  'https://goeventhungary.netlify.app', 
  'http://localhost:5172', 
  'https://goeventdev.netlify.app', 
  /^https:\/\/goeventapiservice\.cyclic\.app\/.*$/i, 
  'https://goeventapiservice.cyclic.app']; // Swagger cím hozzáadva

module.exports = (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer; // Az "origin" vagy "referer" fejlécből olvassuk ki az értéket
  if (allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
  }) || origin === '*') { // Hozzáadva: engedélyezés az '*' origin-ről érkező kéréseknek is
    return next();
  } else {
    return res.status(403).send('Hozzáférés megtagadva!');
  }
};
