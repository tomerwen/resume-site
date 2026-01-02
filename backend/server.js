const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// Security: Request size limit (prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security: Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Remove server header
  res.removeHeader('X-Powered-By');
  next();
});

// Simple rate limiting (in-memory, for production use redis)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window

app.use('/api/visitors', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIp)) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(clientIp);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }
  
  limit.count++;
  next();
});

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

app.use(express.static(path.join(__dirname, '../site')));

// PostgreSQL connection pool
if (!process.env.POSTGRES_PASSWORD) {
  console.error('ERROR: POSTGRES_PASSWORD environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database table on startup
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT
      )
    `);
    console.log('Database table initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit - allow retries
  }
}

// Input validation and sanitization
function sanitizeInput(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  // Remove null bytes and trim
  let sanitized = str.replace(/\0/g, '').trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

function validateInput(firstName, company, role) {
  const errors = [];
  
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    errors.push('First name is required');
  } else if (firstName.length > 255) {
    errors.push('First name is too long (max 255 characters)');
  }
  
  if (!company || typeof company !== 'string' || company.trim().length === 0) {
    errors.push('Company name is required');
  } else if (company.length > 255) {
    errors.push('Company name is too long (max 255 characters)');
  }
  
  if (!role || typeof role !== 'string' || role.trim().length === 0) {
    errors.push('Role is required');
  } else if (role.length > 255) {
    errors.push('Role is too long (max 255 characters)');
  }
  
  return errors;
}

// API endpoint to handle visitor form submission
app.post('/api/visitors', async (req, res) => {
  try {
    const { firstName, company, role, userAgent } = req.body;

    // Validate input
    const validationErrors = validateInput(firstName, company, role);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Sanitize inputs
    const sanitizedFirstName = sanitizeInput(firstName, 255);
    const sanitizedCompany = sanitizeInput(company, 255);
    const sanitizedRole = sanitizeInput(role, 255);
    const sanitizedUserAgent = userAgent ? sanitizeInput(userAgent, 1000) : null;

    // Insert visitor data into database
    const result = await pool.query(
      `INSERT INTO visitors (first_name, company, role, user_agent) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, first_name, company, role, timestamp`,
      [sanitizedFirstName, sanitizedCompany, sanitizedRole, sanitizedUserAgent]
    );

    res.status(201).json({
      success: true,
      message: 'Visitor information saved successfully'
      // Don't return full data to client for privacy
    });
  } catch (error) {
    // Log full error for debugging (server-side only)
    console.error('Error saving visitor data:', error);
    // Don't expose internal error details to client
    res.status(500).json({ 
      error: 'Failed to save visitor information. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log error but don't expose details
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected'
      // Don't expose error.message to prevent information leakage
    });
  }
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../site/index.html'));
});

const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize database after server starts
  await initializeDatabase();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});
