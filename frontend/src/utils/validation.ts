// Validation utility for authentication forms

export interface ValidationError {
  field: string;
  message: string;
}

export interface SignInValidation {
  email: string;
  password: string;
}

export interface SignUpValidation {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  userType: 'alumni' | 'student' | 'faculty';
  department?: string;
  joinYear?: string;
}

// Email validation patterns
const EMAIL_PATTERNS = {
  kongu: /^[a-zA-Z]+\.[0-9]{4}\.(mch|aid|aim|mtr|aut|eee|ece|cse|it|eie)@kongu\.edu$/,
  personal: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};

// Phone validation pattern (Indian format)
const PHONE_PATTERN = /^(\+91|91)?[6-9]\d{9}$/;

// Password validation
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Department validation - Updated short forms
const VALID_DEPARTMENTS = [
  'mch', 'aid', 'aim', 'mtr', 'aut', 'eee', 'ece', 'cse', 'it', 'eie'
];

// Department display names mapping
export const DEPARTMENT_NAMES: Record<string, string> = {
  'mch': 'Mechanical Engineering',
  'aid': 'Artificial Intelligence and Data Science',
  'aim': 'Artificial Intelligence and Machine Learning',
  'mtr': 'Mechatronics Engineering',
  'aut': 'Automobile Engineering',
  'eee': 'Electrical and Electronics Engineering',
  'ece': 'Electronics and Communication Engineering',
  'cse': 'Computer Science and Engineering',
  'it': 'Information Technology',
  'eie': 'Electronics and Instrumentation Engineering'
};

// Join year validation
const MIN_JOIN_YEAR = 2000;
const MAX_JOIN_YEAR = new Date().getFullYear() + 1;

export const validateSignIn = (data: SignInValidation): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Email validation
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_PATTERNS.personal.test(data.email.trim())) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  // Password validation
  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (data.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  }

  return errors;
};

export const validateSignUp = (data: SignUpValidation): ValidationError[] => {
  const errors: ValidationError[] = [];

  // First Name validation
  if (!data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  } else if (data.firstName.trim().length < 2) {
    errors.push({ field: 'firstName', message: 'First name must be at least 2 characters long' });
  } else if (!/^[a-zA-Z\s]+$/.test(data.firstName.trim())) {
    errors.push({ field: 'firstName', message: 'First name can only contain letters and spaces' });
  }

  // Last Name validation
  if (!data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  } else if (data.lastName.trim().length < 2) {
    errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters long' });
  } else if (!/^[a-zA-Z\s]+$/.test(data.lastName.trim())) {
    errors.push({ field: 'lastName', message: 'Last name can only contain letters and spaces' });
  }

  // Email validation
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_PATTERNS.personal.test(data.email.trim())) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  // Phone validation
  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else if (!PHONE_PATTERN.test(data.phone.trim())) {
    errors.push({ field: 'phone', message: 'Please enter a valid 10-digit Indian mobile number' });
  }

  // Password validation
  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  } else if (!PASSWORD_PATTERN.test(data.password)) {
    errors.push({ 
      field: 'password', 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
    });
  }

  // Confirm Password validation
  if (!data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
  } else if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  // User Type validation
  if (!data.userType) {
    errors.push({ field: 'userType', message: 'Please select your user type' });
  }

  // Department validation (required for students and faculty)
  if (data.userType === 'student' || data.userType === 'faculty') {
    if (!data.department) {
      errors.push({ field: 'department', message: 'Department is required for students and faculty' });
    } else if (!VALID_DEPARTMENTS.includes(data.department.toLowerCase())) {
      errors.push({ 
        field: 'department', 
        message: `Invalid department. Valid departments: ${VALID_DEPARTMENTS.join(', ')}` 
      });
    }
  }

  // Join Year validation (required for students)
  if (data.userType === 'student') {
    if (!data.joinYear) {
      errors.push({ field: 'joinYear', message: 'Join year is required for students' });
    } else {
      const year = parseInt(data.joinYear);
      if (isNaN(year) || year < MIN_JOIN_YEAR || year > MAX_JOIN_YEAR) {
        errors.push({ 
          field: 'joinYear', 
          message: `Join year must be between ${MIN_JOIN_YEAR} and ${MAX_JOIN_YEAR}` 
        });
      }
    }
  }

  return errors;
};

// Kongu email generation for students
export const generateKonguEmail = (firstName: string, lastName: string, joinYear: string, department: string): string => {
  const name = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '');
  return `${name}.${joinYear}.${department}@kongu.edu`;
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Validate Kongu email format
export const validateKonguEmail = (email: string): boolean => {
  return EMAIL_PATTERNS.kongu.test(email);
};

// Get department display name
export const getDepartmentDisplayName = (department: string): string => {
  const departmentMap: Record<string, string> = {
    'cse': 'Computer Science Engineering',
    'ece': 'Electronics & Communication Engineering',
    'eee': 'Electrical & Electronics Engineering',
    'mech': 'Mechanical Engineering',
    'civil': 'Civil Engineering',
    'chemical': 'Chemical Engineering',
    'biotech': 'Biotechnology',
    'it': 'Information Technology',
    'ai': 'Artificial Intelligence',
    'ai&ds': 'AI & Data Science'
  };
  return departmentMap[department.toLowerCase()] || department;
};

// Get join year options
export const getJoinYearOptions = (): { value: string; label: string }[] => {
  const currentYear = new Date().getFullYear();
  const options = [];
  
  for (let year = currentYear; year >= MIN_JOIN_YEAR; year--) {
    options.push({
      value: year.toString(),
      label: `${year} (${getRomanNumeral(currentYear - year + 1)} Year)`
    });
  }
  
  return options;
};

// Convert to Roman numerals
const getRomanNumeral = (num: number): string => {
  const romanNumerals = [
    { value: 1, numeral: 'I' },
    { value: 2, numeral: 'II' },
    { value: 3, numeral: 'III' },
    { value: 4, numeral: 'IV' }
  ];
  
  const found = romanNumerals.find(item => item.value === num);
  return found ? found.numeral : num.toString();
};

