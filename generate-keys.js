const crypto = require('crypto');

// Generate client_key (32 characters)
const client_key = crypto.randomBytes(16).toString('hex');

// Generate client_secret (64 characters)
const client_secret = crypto.randomBytes(32).toString('hex');

// Generate JWT secret (64 characters)
const jwt_secret = crypto.randomBytes(32).toString('hex');

console.log('CLIENT_KEY=' + client_key);
console.log('CLIENT_SECRET=' + client_secret);
console.log('JWT_SECRET=' + jwt_secret);

// Also generate API key for external services
const api_key = crypto.randomBytes(24).toString('hex');
console.log('API_KEY=' + api_key);
