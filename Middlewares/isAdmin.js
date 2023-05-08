const jwt = require('jsonwebtoken');

function isAdmin(req, res, next) {
  const token = req.headers.authorization;
  if (token) {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.permission === 'admin') {
      next();
    } else {
      res.status(401).json({ message: 'Nincs jogosultsága!' });
    }
  } else {
    res.status(401).json({ message: 'Nincsen bejelentkezve' });
  }
}

module.exports = isAdmin;



