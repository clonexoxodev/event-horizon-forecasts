#!/usr/bin/env node

/**
 * Generate a secure JWT secret for production use
 * 
 * Usage:
 *   node generate-jwt-secret.js
 * 
 * This will generate a cryptographically secure random string
 * suitable for use as JWT_SECRET in your environment variables.
 */

const crypto = require('crypto');

// Generate 32 bytes of random data and encode as base64
const secret = crypto.randomBytes(32).toString('base64');

console.log('\n🔐 Generated JWT Secret:\n');
console.log(secret);
console.log('\n📋 Copy this value and use it as JWT_SECRET in your Vercel environment variables.\n');
console.log('⚠️  Keep this secret safe! Never commit it to version control.\n');
