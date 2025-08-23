// server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

/* --- small debug: identify running instance --- */
app.get('/__whoami', (req, res) => {
  res.json({
    pid: process.pid,
    cwd: process.cwd(),
    startedAt: new Date().toISOString(),
    nodeVersion: process.version
  });
});

/* --- request logger --- */
app.use((req, res, next) => {
  console.log('[REQ]', new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use(helmet());
app.use(morgan('dev'));

// bump payload limit for profile updates
app.use(express.json({ limit: '200kb' }));
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

/* --- mount routes --- */
app.use('/api/auth', authRoutes);
console.log('Mounted /api/auth');

app.use('/api/profile', profileRoutes);
console.log('Mounted /api/profile (router attached)');

/* --- helper: check if router has a path (best-effort) --- */
function routerHasPath(router, routePath) {
  if (!router || !router.stack) return false;
  for (const layer of router.stack) {
    if (layer.route && layer.route.path) {
      if (Array.isArray(layer.route.path)) {
        if (layer.route.path.includes(routePath)) return true;
      } else if (layer.route.path === routePath) {
        return true;
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // nested
      for (const nested of layer.handle.stack) {
        if (nested.route && nested.route.path && nested.route.path === routePath) return true;
      }
    }
  }
  return false;
}

/* --- Only register a server-level fallback /api/profile/ping if the mounted router does not provide one --- */
if (!routerHasPath(profileRoutes, '/ping')) {
  app.get('/api/profile/ping', (req, res) => {
    res.json({ ok: true, route: '/api/profile/ping (server-level fallback)' });
  });
  console.log('Registered server-level fallback /api/profile/ping');
} else {
  console.log('profileRoutes already contains /ping; no server-level fallback registered.');
}

/* serve uploaded files */
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

/* --- print each mounted router's routes explicitly (no regex parsing) --- */
function printRouterRoutes(mountPath, router) {
  try {
    if (!router || !router.stack) {
      console.warn(`No router.stack for ${mountPath}`);
      return;
    }
    console.log(`Routes for mount "${mountPath}" (from router.stack):`);
    router.stack.forEach(layer => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',').padEnd(8);
        const fullPath = path.posix.join(mountPath, layer.route.path).replace(/\/+/g, '/');
        console.log(`  ${methods}  ${fullPath}`);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack.forEach(nested => {
          if (nested.route && nested.route.path) {
            const methods = Object.keys(nested.route.methods || {}).map(m => m.toUpperCase()).join(',').padEnd(8);
            const fullPath = path.posix.join(mountPath, nested.route.path).replace(/\/+/g, '/');
            console.log(`  ${methods}  ${fullPath}`);
          }
        });
      }
    });
  } catch (err) {
    console.warn('printRouterRoutes error for', mountPath, err && err.stack ? err.stack : err);
  }
}

printRouterRoutes('/api/auth', authRoutes);
printRouterRoutes('/api/profile', profileRoutes);

/* --- simple endpoint to view route list at runtime (best-effort) --- */
app.get('/__routes', (req, res) => {
  const routes = [];

  // top-level direct routes
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
        routes.push({ path: layer.route.path, methods });
      }
    });
  }

  function collect(mountPath, router) {
    if (!router || !router.stack) return;
    router.stack.forEach(layer => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
        const fullPath = path.posix.join(mountPath, layer.route.path).replace(/\/+/g, '/');
        routes.push({ path: fullPath, methods });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack.forEach(nested => {
          if (nested.route && nested.route.path) {
            const methods = Object.keys(nested.route.methods || {}).map(m => m.toUpperCase()).join(',');
            const fullPath = path.posix.join(mountPath, nested.route.path).replace(/\/+/g, '/');
            routes.push({ path: fullPath, methods });
          }
        });
      }
    });
  }
  collect('/api/auth', authRoutes);
  collect('/api/profile', profileRoutes);

  res.json(routes);
});

app.get('/api/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

/* error handler */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && (err.stack || err.message || err));
  res.status(err && err.status ? err.status : 500).json({ error: (err && err.message) || 'Server error' });
});

/* --- DB connect and start server --- */
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
