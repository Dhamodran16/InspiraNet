const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './config.env' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  // Google Meet scopes for conference creation
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.created',
  // Standard OAuth scopes
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const generateAuthUrl = (state) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Forces refresh token
    state
  });
};

const getTokensFromCode = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens; // { access_token, refresh_token, expiry_date_ms }
};

const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

const getCalendar = () => google.calendar({ version: 'v3', auth: oauth2Client });

const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

module.exports = { 
  generateAuthUrl, 
  getTokensFromCode, 
  setCredentials,
  getCalendar,
  refreshAccessToken
};
