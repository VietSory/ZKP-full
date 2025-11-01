// This file exports middleware functions that can be used to process requests before they reach the route handlers.

const express = require('express');
const router = express.Router();

// Example middleware function
const exampleMiddleware = (req, res, next) => {
    console.log('Request received at:', req.originalUrl);
    next();
};

function requireLogin(req, res, next) {
  if (!req.session.UID) {
    return res.status(401).json({ redirect: '/login' });
  }
  next();
}


// Exporting middleware functions
module.exports = {
    exampleMiddleware,
    requireLogin
};