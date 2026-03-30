require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const yaml    = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const eventRoutes    = require('./routes/events');
const bookingRoutes  = require('./routes/bookings');
const userRoutes     = require('./routes/users');
const errorHandler   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());

// ── Swagger / OpenAPI docs ────────────────────────────────────
const swaggerDoc = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'swagger.yaml'), 'utf8')
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ── Routes ────────────────────────────────────────────────────
app.use('/events',   eventRoutes);
app.use('/bookings', bookingRoutes);
app.use('/users',    userRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;
