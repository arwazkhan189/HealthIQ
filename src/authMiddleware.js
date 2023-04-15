const jwt = require("jsonwebtoken");
const { auth } = require("firebase-admin");

//authentication needed for page
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, "healthiq", (err, decodedToken) => {
      if (err) {
        res.redirect("/signin");
      } else {
        next();
      }
    });
  } else {
    res.redirect("/signin");
  }
};

//check current user in every page
const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, "healthiq", async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        let user = await auth().getUserByEmail(decodedToken.id);
        res.locals.user = user.email;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };
