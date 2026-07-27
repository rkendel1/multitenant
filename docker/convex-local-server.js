/**
 * =============================================================================
 * Local Convex Development Server
 * =============================================================================
 * This is a mock server that simulates the Convex HTTP API for local
 * development and testing purposes.
 *
 * Note: This is NOT a full Convex implementation. For production use,
 * deploy to Convex Cloud (https://convex.dev).
 *
 * Supported operations:
 * - POST /api/query - Execute queries
 * - POST /api/mutation - Execute mutations
 * - GET /health - Health check endpoint
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.CONVEX_PORT || 3210;
const DATA_DIR = process.env.CONVEX_DATA_DIR || '/app/data';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (persisted to disk)
let store = {
  tenants: {},
  users: {},
  memberships: {},
};

// Load persisted data
const dataFile = path.join(DATA_DIR, 'store.json');
try {
  if (fs.existsSync(dataFile)) {
    store = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    console.log('Loaded persisted data from disk');
  }
} catch (err) {
  console.error('Failed to load persisted data:', err.message);
}

// Save data to disk
function persistData() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to persist data:', err.message);
  }
}

// =============================================================================
// Query Handlers
// =============================================================================

const queryHandlers = {
  'tenants:getBySlug': ({ slug }) => {
    return Object.values(store.tenants).find(t => t.slug === slug) || null;
  },

  'tenants:getById': ({ id }) => {
    return store.tenants[id] || null;
  },

  'tenants:list': () => {
    return Object.values(store.tenants);
  },

  'tenants:listForUser': ({ userId }) => {
    const membershipList = Object.values(store.memberships)
      .filter(m => m.userId === userId);
    return membershipList.map(m => store.tenants[m.tenantId]).filter(Boolean);
  },

  'users:getById': ({ id }) => {
    return store.users[id] || null;
  },

  'users:getByEmail': ({ email }) => {
    return Object.values(store.users).find(u => u.email === email) || null;
  },

  'memberships:get': ({ userId, tenantId }) => {
    const key = `${userId}:${tenantId}`;
    return store.memberships[key] || null;
  },

  'memberships:listForTenant': ({ tenantId }) => {
    return Object.values(store.memberships)
      .filter(m => m.tenantId === tenantId);
  },
};

// =============================================================================
// Mutation Handlers
// =============================================================================

const mutationHandlers = {
  'tenants:create': ({ name, slug, ownerId }) => {
    const id = uuidv4();
    const tenant = {
      _id: id,
      name,
      slug,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.tenants[id] = tenant;
    persistData();
    return tenant;
  },

  'tenants:update': ({ id, name, slug }) => {
    if (!store.tenants[id]) {
      throw new Error(`Tenant not found: ${id}`);
    }
    if (name) store.tenants[id].name = name;
    if (slug) store.tenants[id].slug = slug;
    store.tenants[id].updatedAt = Date.now();
    persistData();
    return store.tenants[id];
  },

  'tenants:delete': ({ id }) => {
    if (!store.tenants[id]) {
      throw new Error(`Tenant not found: ${id}`);
    }
    delete store.tenants[id];
    // Also delete related memberships
    Object.keys(store.memberships).forEach(key => {
      if (store.memberships[key].tenantId === id) {
        delete store.memberships[key];
      }
    });
    persistData();
    return { success: true };
  },

  'users:create': ({ email, name, passwordHash }) => {
    const id = uuidv4();
    const user = {
      _id: id,
      email,
      name,
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.users[id] = user;
    persistData();
    return user;
  },

  'users:update': ({ id, name, email }) => {
    if (!store.users[id]) {
      throw new Error(`User not found: ${id}`);
    }
    if (name) store.users[id].name = name;
    if (email) store.users[id].email = email;
    store.users[id].updatedAt = Date.now();
    persistData();
    return store.users[id];
  },

  'memberships:create': ({ userId, tenantId, role }) => {
    const key = `${userId}:${tenantId}`;
    const membership = {
      _id: key,
      userId,
      tenantId,
      role: role || 'member',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.memberships[key] = membership;
    persistData();
    return membership;
  },

  'memberships:updateRole': ({ userId, tenantId, role }) => {
    const key = `${userId}:${tenantId}`;
    if (!store.memberships[key]) {
      throw new Error(`Membership not found: ${key}`);
    }
    store.memberships[key].role = role;
    store.memberships[key].updatedAt = Date.now();
    persistData();
    return store.memberships[key];
  },

  'memberships:delete': ({ userId, tenantId }) => {
    const key = `${userId}:${tenantId}`;
    if (!store.memberships[key]) {
      throw new Error(`Membership not found: ${key}`);
    }
    delete store.memberships[key];
    persistData();
    return { success: true };
  },
};

// =============================================================================
// API Routes
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'convex-local', timestamp: Date.now() });
});

// Query endpoint
app.post('/api/query', (req, res) => {
  try {
    const { path: queryPath, args } = req.body;

    if (!queryPath) {
      return res.status(400).json({ error: 'Missing query path' });
    }

    const handler = queryHandlers[queryPath];
    if (!handler) {
      return res.status(404).json({ error: `Unknown query: ${queryPath}` });
    }

    const result = handler(args || {});
    res.json({ success: true, value: result });
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mutation endpoint
app.post('/api/mutation', (req, res) => {
  try {
    const { path: mutationPath, args } = req.body;

    if (!mutationPath) {
      return res.status(400).json({ error: 'Missing mutation path' });
    }

    const handler = mutationHandlers[mutationPath];
    if (!handler) {
      return res.status(404).json({ error: `Unknown mutation: ${mutationPath}` });
    }

    const result = handler(args || {});
    res.json({ success: true, value: result });
  } catch (err) {
    console.error('Mutation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Action endpoint (alias for mutation)
app.post('/api/action', (req, res) => {
  try {
    const { path: actionPath, args } = req.body;

    if (!actionPath) {
      return res.status(400).json({ error: 'Missing action path' });
    }

    // Try mutation handlers first, then query handlers
    const handler = mutationHandlers[actionPath] || queryHandlers[actionPath];
    if (!handler) {
      return res.status(404).json({ error: `Unknown action: ${actionPath}` });
    }

    const result = handler(args || {});
    res.json({ success: true, value: result });
  } catch (err) {
    console.error('Action error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Debug: List all data
app.get('/api/debug/store', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Debug endpoint only available in development' });
  }
  res.json(store);
});

// Debug: Reset all data
app.post('/api/debug/reset', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Debug endpoint only available in development' });
  }
  store = { tenants: {}, users: {}, memberships: {} };
  persistData();
  res.json({ success: true, message: 'Store reset' });
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Local Convex Development Server                         ║
║                                                               ║
║   Server running at http://0.0.0.0:${PORT}                      ║
║                                                               ║
║   Endpoints:                                                  ║
║   • POST /api/query     - Execute queries                     ║
║   • POST /api/mutation  - Execute mutations                   ║
║   • POST /api/action    - Execute actions                     ║
║   • GET  /health        - Health check                        ║
║                                                               ║
║   Note: This is a MOCK server for development only.           ║
║   For production, use Convex Cloud (https://convex.dev)       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
});
