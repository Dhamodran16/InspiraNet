# Google Calendar OAuth Connection Fix

## 🔍 **Root Cause Analysis**

You're experiencing two main issues:

1. **404 Error**: The redirect URI configured in your Google Cloud Console doesn't match your backend configuration
2. **CSP Error**: Browser extension scripts are interfering with Google OAuth (NOT a code issue - this is from Chrome extensions)

## ✅ **Solution Steps**

### **Step 1: Verify Google Cloud Console Configuration**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 Client ID: `882641237629-60cl5h8j028evfu4ljtgd7n9mosk5usn`
4. Click to edit it
5. Under **Authorized redirect URIs**, ensure you have EXACTLY:
   ```
   http://localhost:5000/api/auth/callback
   ```

### **Step 2: Check Environment Configuration**

Your `backend/config.env` shows:
```
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

This is correct. Make sure your Google Cloud Console matches this EXACTLY (case-sensitive, no trailing slashes).

### **Step 3: Enable Required APIs**

In Google Cloud Console, ensure these APIs are enabled:

1. **Google Calendar API** ✅
2. **Google Meet API** ✅  
3. **Google People API** (for profile access)
4. **Google OAuth2 API** (should be auto-enabled)

### **Step 4: Verify Backend is Running**

Make sure your backend server is running on port 5000:

```bash
cd backend
npm start
```

You should see:
```
🚀 Google Calendar API server running on port 5000
🔐 OAuth 2.0: http://localhost:5000/api/auth/google
```

### **Step 5: Test OAuth Flow Directly**

Test the OAuth endpoint directly in your browser:

```
http://localhost:5000/api/auth/google
```

This should redirect you to Google's OAuth consent screen.

### **Step 6: Clear Browser Cache and Cookies**

The CSP error you're seeing is from browser extensions (content.js:1). To fix:

1. **Disable all browser extensions temporarily**
2. **Clear browser cache and cookies** for localhost
3. **Try in incognito/private mode**

### **Step 7: Check Frontend Configuration**

Verify your frontend has the correct backend URL:

Create `frontend/.env.local`:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=882641237629-60cl5h8j028evfu4ljtgd7n9mosk5usn
```

## 🐛 **Common Issues and Fixes**

### Issue 1: "redirect_uri_mismatch"
**Error**: `redirect_uri_mismatch`

**Fix**: The redirect URI in Google Cloud Console must EXACTLY match your `GOOGLE_REDIRECT_URI` in `config.env`:
- ✅ Correct: `http://localhost:5000/api/auth/callback`
- ❌ Wrong: `http://localhost:5000/api/auth/callback/` (trailing slash)
- ❌ Wrong: `http://localhost:5000/api/auth/callback` (extra space)

### Issue 2: "CSP Error"
**Error**: `Refused to evaluate a string as JavaScript because 'unsafe-eval'`

**Fix**: This is from a Chrome extension (autotrack.studyquicks.com). 
- Disable extensions or use incognito mode
- This is NOT a bug in your code

### Issue 3: OAuth Opens in New Tab
**Current Behavior**: The form submission opens OAuth in same window

**Fix**: If you want it to open in a popup, we can modify the approach. But the current implementation should work if configured correctly.

## 🧪 **Testing the Connection**

1. **Start backend**: `cd backend && npm start`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Open browser**: Go to `http://localhost:8083`
4. **Navigate**: Go to Meetings page
5. **Click**: "Connect via Google" button
6. **Expected**: Redirect to Google OAuth consent screen
7. **Complete**: Select Google account and grant permissions
8. **Expected**: Redirect back to dashboard with Google Calendar connected

## 📝 **Verification Checklist**

- [ ] Google Cloud Console has redirect URI: `http://localhost:5000/api/auth/callback`
- [ ] Backend `config.env` has: `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback`
- [ ] Google Cloud Console shows correct OAuth Client ID
- [ ] Google Cloud Console shows correct Client Secret
- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 8083
- [ ] Required APIs are enabled in Google Cloud Console
- [ ] Test URL `http://localhost:5000/api/auth/google` redirects to Google

## 🔧 **If Still Not Working**

If you're still getting errors after following these steps:

1. **Check browser console** for specific error messages
2. **Check backend logs** for OAuth callback errors
3. **Verify MongoDB** is connected (tokens are stored in database)
4. **Check Network tab** in browser dev tools to see which request is failing

## 📞 **Need Help?**

Share these details if the issue persists:
1. Exact error message from browser console
2. Backend logs when clicking "Connect via Google"
3. Network tab showing the OAuth request
4. Screenshot of your Google Cloud Console redirect URIs

