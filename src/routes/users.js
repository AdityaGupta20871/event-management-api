const express = require('express');
const { getUserBookings } = require('../controllers/userController');

const router = express.Router();

// GET /users/:id/bookings
router.get('/:id/bookings', getUserBookings);

module.exports = router;
