# Registration Debug Guide

## Enhanced Logging Added

All validation steps in the registration route now have detailed logging. When a registration fails, you'll see exactly which validation failed.

## Log Messages You'll See

### 1. Request Received
```
📝 POST /api/auth/register - Registration request received
📝 Request body: {...}
```

### 2. Student Registration Processing
```
📝 Processing student registration
```

### 3. Email Format Validation
**If email format is invalid:**
```
❌ Email format validation failed: email@example.com
❌ Expected format: name.yydept@kongu.edu (e.g., john.23aim@kongu.edu)
```

**If email format is valid:**
```
✅ Email parsed - Year: 23 Dept: aim
```

### 4. Department Validation (if provided)
**If department doesn't match:**
```
❌ Department mismatch - Email dept: aim Selected dept: CSE Expected: cse
```

### 5. Current Year Processing
```
📝 Processing currentYear: 3
📝 Calculated joinYear: 2023 from currentYear: 3 year: 2025
📝 Email year: 23 Join year last 2 digits: 23
```

**If currentYear is invalid:**
```
❌ Invalid currentYear value: 5
```

**If email year doesn't match:**
```
❌ Email year mismatch - Email year: 23 Derived join year: 2023 Last 2 digits: 23
```

### 6. Email Existence Check
```
📝 Checking if email exists: email@kongu.edu
✅ Email is available: email@kongu.edu
```

**If email already exists:**
```
❌ Email already exists: email@kongu.edu as type: student
```

### 7. Success
```
✅ Student registered successfully: userId
```

## Error Response Format

All errors now return consistent format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "missingFields": ["field1", "field2"] // if applicable
}
```

## Common Issues and Solutions

### Issue 1: Email Format Validation Fails
**Symptoms:**
```
❌ Email format validation failed
```

**Solution:**
- Email must match: `name.yydept@kongu.edu`
- Example: `john.23aim@kongu.edu`
- `name` = any letters
- `yy` = 2-digit year (e.g., 23)
- `dept` = department code (e.g., aim, cse, eee)

### Issue 2: Email Year Mismatch
**Symptoms:**
```
❌ Email year mismatch - Email year: 23 Derived join year: 2023 Last 2 digits: 23
```

**Calculation:**
- If currentYear = "3" (3rd year)
- Current year = 2025
- Join year = 2025 - (3 - 1) = 2023
- Join year last 2 digits = 23
- Email year must match = 23

**Solution:**
- Verify email year matches calculated join year
- Check currentYear is correct (I/II/III/IV or 1/2/3/4)
- Verify current year calculation is correct

### Issue 3: Department Mismatch
**Symptoms:**
```
❌ Department mismatch - Email dept: aim Selected dept: CSE Expected: cse
```

**Solution:**
- Email department code must match selected department
- Department codes: aim, cse, eee, ece, it, etc.
- Department mapping: CSE → cse, AIM → aim, etc.

### Issue 4: Email Already Exists
**Symptoms:**
```
❌ Email already exists: email@kongu.edu as type: student
```

**Solution:**
- Use a different email
- Or login with existing account

## Testing Your Registration

Based on your logs:
```
Request body: {
  "firstName": "Dhamodraprasath",
  "lastName": "CM",
  "email": "dhamodraprasathcm.23aim@kongu.edu",
  "password": "pass123",
  "confirmPassword": "pass123",
  "userType": "student",
  "currentYear": "3"
}
```

**Expected flow:**
1. ✅ Email format should match (dhamodraprasathcm.23aim@kongu.edu)
2. ✅ Email year = 23
3. ✅ currentYear = "3" → joinYear = 2025 - (3-1) = 2023 → last 2 digits = 23
4. ✅ Email year (23) should match join year (23)

**If it fails, check logs for:**
- Which validation step failed
- What the calculated values are
- What the expected values are

## Next Steps

1. **Deploy the updated code** with enhanced logging
2. **Try registration again**
3. **Check logs** for detailed validation steps
4. **Identify which validation fails** from the logs
5. **Fix the issue** based on the specific error message

---

**Status**: Enhanced logging added ✅
**Ready for**: Testing and debugging

