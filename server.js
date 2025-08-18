const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  console.log('[REQ]', new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const rawCorsOrigin = process.env.CORS_ORIGIN || '';
const corsOriginArray = rawCorsOrigin === '' ? [] : rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean);
const allowCredentials = String(process.env.CORS_ALLOW_CREDENTIALS || '').toLowerCase() === 'true';

if (corsOriginArray.length === 0) {
  app.use(cors());
} else {
  app.use(cors({
    origin: corsOriginArray,
    credentials: allowCredentials
  }));
}

app.use('/api/auth', authRoutes);
app.use('/api/authRoutes', authRoutes);

app.get('/__routes', (req, res) => {
  const routes = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach(mw => {
      if (mw.route) {
        routes.push({ path: mw.route.path, methods: Object.keys(mw.route.methods).join(',').toUpperCase() });
      }
    });
  }
  res.json(routes);
});

app.get('/api/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to DB, exiting.', err);
    process.exit(1);
  });
