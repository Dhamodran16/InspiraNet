const VALID_DEPARTMENTS = [
  'cse', 'ece', 'eee', 'mech', 'civil', 'chemical', 'biotech', 'it', 'ai', 'ai&ds', 'aiml'
];

const VALID_DEPARTMENT_NAMES = {
  'cse': 'Computer Science Engineering',
  'ece': 'Electronics & Communication Engineering',
  'eee': 'Electrical & Electronics Engineering',
  'mech': 'Mechanical Engineering',
  'civil': 'Civil Engineering',
  'chemical': 'Chemical Engineering',
  'biotech': 'Biotechnology',
  'it': 'Information Technology',
  'ai': 'Artificial Intelligence',
  'ai&ds': 'AI & Data Science',
  'aiml': 'Artificial Intelligence And Machine Learning'
};

/**
 * Validate student email format: name.yrdept@kongu.edu
 * @param {string} email - Email to validate
 * @param {string} dept - Department code
 * @param {number} joinYear - Year when student joined
 * @returns {boolean} - True if valid
 */
function validateStudentEmail(email, dept, joinYear) {
  if (!email || !dept || !joinYear) return false;
  
  const currentYear = new Date().getFullYear();
  if (joinYear > currentYear || joinYear < 2000) return false;
  
  const pattern = new RegExp(
    `^[a-z]+\.${joinYear}${dept.toLowerCase()}@kongu\.edu$`,
    'i'
  );
  
  return pattern.test(email.toLowerCase());
}

/**
 * Generate student email from user inputs
 * @param {string} name - Student name
 * @param {number} joinYear - Year when student joined
 * @param {string} dept - Department code
 * @returns {string} - Generated email
 */
function generateStudentEmail(name, joinYear, dept) {
  if (!name || !joinYear || !dept) return null;
  
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  const cleanDept = dept.toLowerCase();
  
  return `${cleanName}.${joinYear}${cleanDept}@kongu.edu`;
}

/**
 * Validate faculty email format: name.dept@kongu.edu
 * @param {string} email - Email to validate
 * @param {string} dept - Department code
 * @returns {boolean} - True if valid
 */
function validateFacultyEmail(email, dept) {
  if (!email || !dept) return false;
  
  const pattern = new RegExp(
    `^[a-z]+\.${dept.toLowerCase()}@kongu\.edu$`,
    'i'
  );
  
  return pattern.test(email.toLowerCase());
}

/**
 * Validate alumni email (any email provider allowed)
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateAlumniEmail(email) {
  if (!email) return false;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate department code
 * @param {string} dept - Department code to validate
 * @returns {boolean} - True if valid
 */
function validateDepartment(dept) {
  if (!dept) return false;
  return VALID_DEPARTMENTS.includes(dept.toLowerCase());
}

/**
 * Get department name from code
 * @param {string} dept - Department code
 * @returns {string} - Department full name
 */
function getDepartmentName(dept) {
  if (!dept) return null;
  return VALID_DEPARTMENT_NAMES[dept.toLowerCase()] || null;
}

/**
 * Validate join year for students
 * @param {number} joinYear - Year to validate
 * @returns {boolean} - True if valid
 */
function validateJoinYear(joinYear) {
  if (!joinYear || isNaN(joinYear)) return false;
  
  const currentYear = new Date().getFullYear();
  return joinYear >= 2000 && joinYear <= currentYear;
}

/**
 * Get all valid departments
 * @returns {Array} - Array of valid department codes
 */
function getValidDepartments() {
  return VALID_DEPARTMENTS;
}

/**
 * Get all valid department names
 * @returns {Object} - Object mapping codes to names
 */
function getValidDepartmentNames() {
  return VALID_DEPARTMENT_NAMES;
}

module.exports = {
  validateStudentEmail,
  generateStudentEmail,
  validateFacultyEmail,
  validateAlumniEmail,
  validateDepartment,
  getDepartmentName,
  validateJoinYear,
  getValidDepartments,
  getValidDepartmentNames,
  VALID_DEPARTMENTS,
  VALID_DEPARTMENT_NAMES
}; 