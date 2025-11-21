# 🚀 Complete Google Meet Integration Setup Guide

## ✅ What's Already Implemented

Your backend and frontend are now properly configured for Google Meet integration with OAuth 2.0 authentication.

## 🔧 Backend Configuration (Port 5000)

### 1. Environment Variables Setup
Create `backend/config.env` with these exact values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random

# Frontend URLs
FRONTEND_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

### 2. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable these APIs:
   - Google Calendar API
   - Google Meet API
4. Create OAuth 2.0 credentials:
   - **Authorized JavaScript origins**: `http://localhost:3000`, `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:5000/api/auth/callback`

### 3. Backend Dependencies
All required packages are already installed:
- `express`
- `googleapis`
- `cors`
- `dotenv`
- `jsonwebtoken`

## 🎨 Frontend Configuration (Port 3000)

### 1. Environment Variables
Create `frontend/.env.local`:

```env
# Backend URLs
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:3000

# Development Settings
VITE_ENVIRONMENT=development
```

### 2. Frontend Dependencies
All required packages are already installed:
- `react`
- `typescript`
- `tailwindcss`
- `lucide-react`

## 🚀 How to Start

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
Server will run on: `http://localhost:5000`

### 2. Start Frontend Server
```bash
cd frontend
npm run dev
```
Frontend will run on: `http://localhost:3000`

## 🔐 OAuth Flow Implementation

### 1. User clicks "Connect with Google"
- Frontend calls `loginWithGoogle()` from AuthContext
- Redirects to: `http://localhost:5000/api/auth/google`

### 2. Backend redirects to Google
- Google OAuth consent screen
- User grants permissions

### 3. Google redirects back
- To: `http://localhost:5000/api/auth/callback`
- Backend exchanges code for tokens
- Redirects to: `http://localhost:3000/dashboard?token=JWT_TOKEN&google_auth=success`

### 4. Frontend handles redirect
- AuthContext detects token in URL
- Stores token in localStorage
- User is authenticated

## 📅 Meeting Creation Flow

### 1. User creates meeting
- Fills form in `GoogleCalendarHostDashboard`
- Submits to: `POST /api/meetings/create-meeting`

### 2. Backend creates Google Meet
- Uses Google Calendar API
- Creates calendar event with Meet link
- Returns meeting details

### 3. Frontend displays meeting
- Shows meeting with real Google Meet link
- User can join meeting directly

## 🧪 Testing the Integration

### 1. Test OAuth Flow
1. Go to `http://localhost:3000/dashboard`
2. Click "Meetings" in sidebar
3. Click "Connect via Google"
4. Complete Google OAuth
5. Should redirect back to dashboard

### 2. Test Meeting Creation
1. After Google OAuth, create a meeting
2. Fill in meeting details
3. Submit form
4. Should get real Google Meet link

### 3. Test Meeting Join
1. Click "Join Meet" button
2. Should open Google Meet in new tab
3. Meeting should be accessible

## 🔧 Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error
- **Fix**: Ensure Google Console redirect URI is exactly: `http://localhost:5000/api/auth/callback`
- **Not**: `http://localhost:3000/auth/callback`

#### 2. CORS Errors
- **Fix**: Backend CORS is configured for `localhost:3000` and `localhost:5173`
- **Check**: Frontend is running on correct port

#### 3. Token Not Found
- **Fix**: Check if `JWT_SECRET` is set in backend `.env`
- **Check**: Token is being passed in Authorization header

#### 4. Google API Errors
- **Fix**: Ensure Google Calendar API is enabled
- **Fix**: Check OAuth scopes include calendar permissions

### Debug Steps

1. **Check Backend Logs**:
   ```bash
   cd backend
   npm run dev
   ```
   Look for OAuth flow logs

2. **Check Frontend Console**:
   - Open browser DevTools
   - Check Network tab for API calls
   - Check Console for errors

3. **Test API Endpoints**:
   ```bash
   # Test health endpoint
   curl http://localhost:5000/api/health
   
   # Test auth endpoint
   curl http://localhost:5000/api/auth/google
   ```

## 📋 API Endpoints

### Authentication
- `GET /api/auth/google` - Start OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/validate` - Check auth status

### Meetings
- `POST /api/meetings/create-meeting` - Create meeting
- `GET /api/meetings/meetings` - List meetings
- `DELETE /api/meetings/delete-meeting/:id` - Delete meeting

## 🎯 Success Criteria

✅ **OAuth Flow Works**:
- User can authenticate with Google
- Token is stored and validated
- User stays logged in

✅ **Meeting Creation Works**:
- Real Google Meet links are generated
- Meetings appear in Google Calendar
- Links are clickable and functional

✅ **Integration Complete**:
- Frontend and backend communicate
- No CORS or authentication errors
- Smooth user experience

## 🚀 Next Steps

1. **Test the complete flow** from OAuth to meeting creation
2. **Customize the UI** to match your design
3. **Add error handling** for edge cases
4. **Deploy to production** with proper environment variables

## 📞 Support

If you encounter issues:
1. Check the console logs (both frontend and backend)
2. Verify all environment variables are set
3. Ensure Google Cloud Console is configured correctly
4. Test each step of the OAuth flow individually

Your Google Meet integration is now ready to use! 🎉
