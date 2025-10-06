# Google Meet Integration Setup Guide

This guide will help you set up the Google Calendar and Google Meet integration for the InspiraNet application.

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud Project with billing enabled
2. **Google Account**: A Google account with Calendar access
3. **Domain Access**: Access to configure OAuth redirect URIs

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one
3. Enable billing if not already enabled

### 1.2 Enable Required APIs
1. Go to "APIs & Services" > "Library"
2. Search and enable these APIs:
   - **Google Calendar API**
   - **Google Meet API** (if available)

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Configure the following:

#### Authorized JavaScript Origins:
```
http://localhost:8083
http://localhost:3000
https://yourdomain.com (for production)
```

#### Authorized Redirect URIs:
```
http://localhost:8083
http://localhost:3000
https://yourdomain.com (for production)
```

5. Download the JSON file - you'll need the `client_id` from it

### 1.4 Create API Key (Optional)
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key

## Step 2: Environment Configuration

### 2.1 Frontend Environment
Create a `.env.local` file in the `frontend` directory:

```env
# Google API Configuration
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_api_key_here

# Other existing variables...
VITE_BACKEND_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MEETING_URL=http://localhost:5000
```

### 2.2 Backend Environment
Update your `backend/config.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Other existing variables...
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
```

## Step 3: Testing the Integration

### 3.1 Start the Application
1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

### 3.2 Test Google Authentication
1. Navigate to the Google Calendar Meetings page
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify you're authenticated

### 3.3 Test Meeting Creation
1. Click "Create Meeting"
2. Fill in the meeting details:
   - Title: "Test Meeting"
   - Description: "Testing Google Meet integration"
   - Start Time: Current time + 10 minutes
   - End Time: Current time + 20 minutes
   - Attendees: (optional) email addresses
3. Click "Create Meeting"
4. Verify the meeting is created with a Google Meet link

## Step 4: Production Deployment

### 4.1 Update OAuth Configuration
1. In Google Cloud Console, update the OAuth 2.0 credentials
2. Add your production domain to:
   - Authorized JavaScript Origins
   - Authorized Redirect URIs

### 4.2 Update Environment Variables
1. Update production environment variables with production URLs
2. Ensure HTTPS is used for production

### 4.3 Domain Verification
1. For production, you may need to verify your domain
2. Submit your app for Google OAuth verification if you expect >100 users

## Troubleshooting

### Common Issues

#### 1. "Access Blocked" Error
- **Cause**: OAuth consent screen not configured
- **Solution**: Configure OAuth consent screen in Google Cloud Console

#### 2. "redirect_uri_mismatch" Error
- **Cause**: Redirect URI not in authorized list
- **Solution**: Add your domain to authorized redirect URIs

#### 3. "Failed to generate Google Meet link"
- **Cause**: API not enabled or insufficient permissions
- **Solution**: Enable Google Calendar API and check scopes

#### 4. CORS Errors
- **Cause**: Domain not in authorized JavaScript origins
- **Solution**: Add your domain to authorized JavaScript origins

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are being made
3. **Check Google Cloud Console**: Verify API quotas and usage
4. **Test with Google API Explorer**: Use [Google API Explorer](https://developers.google.com/apis-explorer) to test API calls

## API Scopes Used

The application uses these Google API scopes:
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Calendar events access

## Security Considerations

1. **Client ID**: Can be public (it's in the frontend)
2. **Client Secret**: Must be kept secret (backend only)
3. **API Key**: Can be restricted by domain/IP
4. **HTTPS**: Required for production
5. **Token Storage**: Tokens are stored in browser memory/session

## Features Implemented

✅ **Google OAuth 2.0 Authentication**
✅ **Google Calendar API Integration**
✅ **Google Meet Link Generation**
✅ **Meeting Creation with Conference Data**
✅ **Meeting Management (List, Delete)**
✅ **Real-time Authentication Status**
✅ **Error Handling and User Feedback**
✅ **Responsive UI Components**

## Next Steps

1. **Enhanced Meeting Features**: Add meeting recording, waiting rooms
2. **Calendar Sync**: Sync with existing calendar events
3. **Meeting Analytics**: Track meeting attendance and duration
4. **Integration**: Connect with other Google Workspace apps
5. **Mobile Support**: Optimize for mobile devices

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your Google Cloud Console configuration
3. Test with the Google API Explorer
4. Review the Google Calendar API documentation

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Meet API Documentation](https://developers.google.com/meet)
- [Google Cloud Console](https://console.cloud.google.com)
