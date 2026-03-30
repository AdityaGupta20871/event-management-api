const express = require('express');
const { body } = require('express-validator');
const { listEvents, createEvent } = require('../controllers/eventController');
const { checkIn } = require('../controllers/attendanceController');

const router = express.Router();

// GET /events
router.get('/', listEvents);

// POST /events
router.post(
  '/',
  [
    body('title')
      .notEmpty().withMessage('title is required.')
      .isLength({ max: 200 }).withMessage('title must be at most 200 characters.'),
    body('description')
      .optional()
      .isString(),
    body('date')
      .notEmpty().withMessage('date is required.')
      .isISO8601().withMessage('date must be a valid ISO 8601 datetime.')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('date must be in the future.');
        }
        return true;
      }),
    body('total_capacity')
      .notEmpty().withMessage('total_capacity is required.')
      .isInt({ min: 1 }).withMessage('total_capacity must be a positive integer.'),
  ],
  createEvent
);

// POST /events/:id/attendance
router.post(
  '/:id/attendance',
  [
    body('booking_code')
      .notEmpty().withMessage('booking_code is required.')
      .isUUID().withMessage('booking_code must be a valid UUID.'),
  ],
  checkIn
);

module.exports = router;
