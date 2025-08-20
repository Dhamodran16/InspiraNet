// MongoDB Integration Utilities for Frontend

export interface MongoDBUser {
  _id: string;
  name: string;
  email: {
    college?: string;
    personal?: string;
  };
  type: 'student' | 'alumni' | 'faculty';
  department?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  studentInfo?: {
    joinYear: number;
    department: string;
    batch?: string;
    section?: string;
    cgpa?: string;
  };
  alumniInfo?: {
    graduationYear?: string;
    currentCompany?: string;
    designation?: string;
  };
  facultyInfo?: {
    designation?: string;
    experience?: number;
    specialization?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MongoDBResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User type validation
export const validateUserType = (type: string): type is 'student' | 'alumni' | 'faculty' => {
  return ['student', 'alumni', 'faculty'].includes(type);
};

// Email validation for different user types
export const validateEmailForUserType = (email: string, userType: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  switch (userType) {
    case 'student':
      // Students must use Kongu email with format: name.yearDept@kongu.edu
      // Example: boobalanj.23aim@kongu.edu
      const studentEmailRegex = /^[a-zA-Z]+\.[0-9]{2}[a-z]+@kongu\.edu$/;
      return studentEmailRegex.test(email);
      
    case 'faculty':
      // Faculty must use Kongu email without year: name.dept@kongu.edu
      // Example: boobalanj.aim@kongu.edu
      const facultyEmailRegex = /^[a-zA-Z]+\.[a-z]+@kongu\.edu$/;
      return facultyEmailRegex.test(email);
      
    case 'alumni':
      // Alumni can use any email provider (Gmail, Yahoo, etc.)
      // Example: boobalan@gmail.com, boobalan@yahoo.com
      return true;
      
    default:
      return false;
  }
};

// Department validation
export const validateDepartment = (department: string): boolean => {
  const validDepartments = [
    'cse', 'ece', 'eee', 'mech', 'civil', 'chemical', 'biotech', 'it', 'ai', 'ai&ds'
  ];
  return validDepartments.includes(department.toLowerCase());
};

// Join year validation
export const validateJoinYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 2000 && year <= currentYear;
};

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Optional: Add more password strength requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password should contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password should contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password should contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// User data sanitization
export const sanitizeUserData = (data: any): any => {
  const sanitized: any = {};
  
  // Sanitize string fields
  if (data.name) sanitized.name = data.name.trim();
  if (data.email) sanitized.email = data.email.trim().toLowerCase();
  if (data.department) sanitized.department = data.department.trim().toLowerCase();
  if (data.bio) sanitized.bio = data.bio.trim();
  if (data.location) sanitized.location = data.location.trim();
  
  // Sanitize numeric fields
  if (data.joinYear) sanitized.joinYear = parseInt(data.joinYear);
  if (data.phone) sanitized.phone = data.phone.replace(/\D/g, '');
  
  // Sanitize arrays
  if (data.skills && Array.isArray(data.skills)) {
    sanitized.skills = data.skills.map((skill: string) => skill.trim()).filter(Boolean);
  }
  
  return sanitized;
};

// Format user data for display
export const formatUserData = (user: MongoDBUser): any => {
  return {
    id: user._id,
    name: user.name,
    email: user.email.personal || user.email.college || 'No email',
    type: user.type.charAt(0).toUpperCase() + user.type.slice(1),
    department: user.department ? user.department.toUpperCase() : 'N/A',
    isVerified: user.isVerified,
    isProfileComplete: user.isProfileComplete,
    joinYear: user.studentInfo?.joinYear || 'N/A',
    createdAt: new Date(user.createdAt).toLocaleDateString(),
    updatedAt: new Date(user.updatedAt).toLocaleDateString()
  };
};

// Generate student email (frontend validation)
export const generateStudentEmail = (name: string, joinYear: number, department: string): string => {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  const yearSuffix = joinYear.toString().slice(-2); // Get last 2 digits of year
  const cleanDept = department.toLowerCase();
  return `${cleanName}.${yearSuffix}${cleanDept}@kongu.edu`;
};

// Generate faculty email (frontend validation)
export const generateFacultyEmail = (name: string, department: string): string => {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  const cleanDept = department.toLowerCase();
  return `${cleanName}.${cleanDept}@kongu.edu`;
};

// Validate student email format
export const validateStudentEmail = (email: string): boolean => {
  // Format: name.yearDept@kongu.edu
  // Example: boobalanj.23aim@kongu.edu
  const studentEmailRegex = /^[a-zA-Z]+\.[0-9]{2}[a-z]+@kongu\.edu$/;
  return studentEmailRegex.test(email);
};

// Validate faculty email format
export const validateFacultyEmail = (email: string): boolean => {
  // Format: name.dept@kongu.edu
  // Example: boobalanj.aim@kongu.edu
  const facultyEmailRegex = /^[a-zA-Z]+\.[a-z]+@kongu\.edu$/;
  return facultyEmailRegex.test(email);
};

// Validate alumni email format
export const validateAlumniEmail = (email: string): boolean => {
  // Alumni can use any email provider
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Extract information from student email
export const parseStudentEmail = (email: string): { name: string; joinYear: string; department: string } | null => {
  const match = email.match(/^([a-zA-Z]+)\.([0-9]{2})([a-z]+)@kongu\.edu$/);
  if (match) {
    return {
      name: match[1],
      joinYear: '20' + match[2], // Convert 23 to 2023
      department: match[3]
    };
  }
  return null;
};

// Extract information from faculty email
export const parseFacultyEmail = (email: string): { name: string; department: string } | null => {
  const match = email.match(/^([a-zA-Z]+)\.([a-z]+)@kongu\.edu$/);
  if (match) {
    return {
      name: match[1],
      department: match[2]
    };
  }
  return null;
};

// Check if user can access student features
export const canAccessStudentFeatures = (user: MongoDBUser): boolean => {
  if (user.type !== 'student') return false;
  
  const currentYear = new Date().getFullYear();
  const joinYear = user.studentInfo?.joinYear;
  
  if (!joinYear) return false;
  
  // Students can access features for 4 years after joining
  return (currentYear - joinYear) < 4;
};

// Check if user can access faculty features
export const canAccessFacultyFeatures = (user: MongoDBUser): boolean => {
  return user.type === 'faculty' && user.isVerified;
};

// Check if user can access alumni features
export const canAccessAlumniFeatures = (user: MongoDBUser): boolean => {
  return user.type === 'alumni' && user.isVerified;
};

// Profile completion percentage
export const calculateProfileCompletion = (user: MongoDBUser): number => {
  let completedFields = 0;
  let totalFields = 0;
  
  // Basic fields
  if (user.name) completedFields++;
  totalFields++;
  
  if (user.email.personal || user.email.college) completedFields++;
  totalFields++;
  
  if (user.department) completedFields++;
  totalFields++;
  
  // Type-specific fields
  if (user.type === 'student') {
    if (user.studentInfo?.joinYear) completedFields++;
    if (user.studentInfo?.batch) completedFields++;
    totalFields += 2;
  }
  
  if (user.type === 'faculty') {
    if (user.facultyInfo?.designation) completedFields++;
    if (user.facultyInfo?.experience) completedFields++;
    totalFields += 2;
  }
  
  if (user.type === 'alumni') {
    if (user.alumniInfo?.graduationYear) completedFields++;
    if (user.alumniInfo?.currentCompany) completedFields++;
    totalFields += 2;
  }
  
  return Math.round((completedFields / totalFields) * 100);
};

// Export all utilities
export default {
  validateUserType,
  validateEmailForUserType,
  validateDepartment,
  validateJoinYear,
  validatePasswordStrength,
  sanitizeUserData,
  formatUserData,
  generateStudentEmail,
  generateFacultyEmail,
  validateStudentEmail,
  validateFacultyEmail,
  validateAlumniEmail,
  parseStudentEmail,
  parseFacultyEmail,
  canAccessStudentFeatures,
  canAccessFacultyFeatures,
  canAccessAlumniFeatures,
  calculateProfileCompletion
};
