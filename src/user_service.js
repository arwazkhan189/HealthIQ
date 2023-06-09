const firebase = require("firebase/app");
require("dotenv").config();
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} = require("firebase/auth");

firebase.initializeApp({
  apiKey: process.env.apiKey,
});

const auth = getAuth();

exports.addUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

exports.authenticate = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

exports.signout = signOut(auth);
