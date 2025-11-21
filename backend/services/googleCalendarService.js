const { google } = require('googleapis');
const axios = require('axios');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Generate OAuth 2.0 authorization URL
  getAuthUrl(userId = null) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/meetings.space.created'
    ];

    const params = {
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    };

    // Include userId in state parameter if provided
    if (userId) {
      const stateData = { userId: userId.toString() };
      params.state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    }

    return this.oauth2Client.generateAuthUrl(params);
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Set credentials for API calls
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Create a Google Meet meeting
  async createMeeting(meetingData) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: meetingData.title,
        description: meetingData.description,
        start: {
          dateTime: meetingData.start_time,
          timeZone: 'UTC',
        },
        end: {
          dateTime: meetingData.end_time,
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        attendees: meetingData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });

      return {
        eventId: response.data.id,
        meetLink: response.data.hangoutLink,
        eventLink: response.data.htmlLink,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        conferenceData: response.data.conferenceData
      };

    } catch (error) {
      console.error('Error creating meeting:', error);
      throw new Error('Failed to create Google Meet meeting');
    }
  }

  // Delete a meeting from Google Calendar
  async deleteMeeting(eventId) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw new Error('Failed to delete meeting from Google Calendar');
    }
  }

  // Get meeting details
  async getMeeting(eventId) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      return {
        eventId: response.data.id,
        meetLink: response.data.hangoutLink,
        eventLink: response.data.htmlLink,
        title: response.data.summary,
        description: response.data.description,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error getting meeting:', error);
      throw new Error('Failed to get meeting details');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Check if token is valid
  async validateToken() {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      await calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = GoogleCalendarService;

