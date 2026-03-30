const express = require('express');
const { body } = require('express-validator');
const { createBooking } = require('../controllers/bookingController');

const router = express.Router();

// POST /bookings
router.post(
  '/',
  [
    body('user_id')
      .notEmpty().withMessage('user_id is required.')
      .isInt({ min: 1 }).withMessage('user_id must be a positive integer.'),
    body('event_id')
      .notEmpty().withMessage('event_id is required.')
      .isInt({ min: 1 }).withMessage('event_id must be a positive integer.'),
  ],
  createBooking
);

module.exports = router;
