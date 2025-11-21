/**
 * Email Expiration Utility
 * Handles Kongu email expiration logic based on year in email address
 * Format: namewithinitial.yydept@kongu.edu (e.g., name.23aim@kongu.edu)
 * Expires 4 years after the year in email (e.g., 23 -> 2023 -> expires 2027)
 */

/**
 * Extract year from Kongu email address
 * @param {string} email - Kongu email address
 * @returns {number|null} - Year (e.g., 2023) or null if invalid
 */
function extractYearFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  
  // Match pattern: name.yydept@kongu.edu
  // Extract yy (2-digit year)
  const match = email.match(/\.(\d{2})[a-z]+@kongu\.edu$/i);
  if (!match) return null;
  
  const twoDigitYear = parseInt(match[1], 10);
  
  // Convert 2-digit year to 4-digit year
  // Assume years 00-99 map to 2000-2099
  const fullYear = 2000 + twoDigitYear;
  
  return fullYear;
}

/**
 * Calculate expiration year for Kongu email
 * @param {string} email - Kongu email address
 * @returns {number|null} - Expiration year or null if invalid
 */
function getExpirationYear(email) {
  const year = extractYearFromEmail(email);
  if (!year) return null;
  
  // Email expires 4 years after the year in email
  return year + 4;
}

/**
 * Check if Kongu email is expired
 * @param {string} email - Kongu email address
 * @returns {boolean} - True if expired
 */
function isEmailExpired(email) {
  const expirationYear = getExpirationYear(email);
  if (!expirationYear) return false; // Invalid email format, can't determine expiration
  
  const currentYear = new Date().getFullYear();
  return currentYear > expirationYear;
}

/**
 * Check if Kongu email will expire within specified days
 * @param {string} email - Kongu email address
 * @param {number} days - Number of days to check ahead (default: 90)
 * @returns {boolean} - True if expiring within specified days
 */
function isEmailExpiringSoon(email, days = 90) {
  const expirationYear = getExpirationYear(email);
  if (!expirationYear) return false;
  
  const expirationDate = new Date(expirationYear, 11, 31); // December 31st of expiration year
  const currentDate = new Date();
  const daysUntilExpiry = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
}

/**
 * Get days until email expiration
 * @param {string} email - Kongu email address
 * @returns {number|null} - Days until expiration or null if invalid/expired
 */
function getDaysUntilExpiration(email) {
  const expirationYear = getExpirationYear(email);
  if (!expirationYear) return null;
  
  const expirationDate = new Date(expirationYear, 11, 31); // December 31st
  const currentDate = new Date();
  const daysUntilExpiry = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry > 0 ? daysUntilExpiry : 0;
}

/**
 * Get expiration date for Kongu email
 * @param {string} email - Kongu email address
 * @returns {Date|null} - Expiration date (December 31st of expiration year) or null
 */
function getExpirationDate(email) {
  const expirationYear = getExpirationYear(email);
  if (!expirationYear) return null;
  
  return new Date(expirationYear, 11, 31); // December 31st
}

/**
 * Validate if email is a Kongu student email
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid Kongu student email format
 */
function isValidKonguStudentEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Pattern: name.yydept@kongu.edu
  const pattern = /^[a-zA-Z]+\.[0-9]{2}[a-z]+@kongu\.edu$/i;
  return pattern.test(email);
}

module.exports = {
  extractYearFromEmail,
  getExpirationYear,
  isEmailExpired,
  isEmailExpiringSoon,
  getDaysUntilExpiration,
  getExpirationDate,
  isValidKonguStudentEmail
};

