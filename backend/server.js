const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../site')));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
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

// API endpoint to handle visitor form submission
app.post('/api/visitors', async (req, res) => {
  try {
    const { firstName, company, role, userAgent } = req.body;

    // Validate required fields
    if (!firstName || !company || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, company, and role are required' 
      });
    }

    // Insert visitor data into database
    const result = await pool.query(
      `INSERT INTO visitors (first_name, company, role, user_agent) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, first_name, company, role, timestamp`,
      [firstName, company, role, userAgent || null]
    );

    res.status(201).json({
      success: true,
      message: 'Visitor information saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving visitor data:', error);
    res.status(500).json({ 
      error: 'Failed to save visitor information',
      message: error.message 
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
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
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
