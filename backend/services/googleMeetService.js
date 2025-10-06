const { google } = require('googleapis');
const User = require('../models/User');

class GoogleMeetService {
  constructor() {
    this.oauth2Client = null;
  }

  // Initialize OAuth2 client with user's tokens
  async initializeClient(userId) {
    try {
      // Check if this is a Google OAuth user (string ID)
      if (userId && userId.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, using default tokens');
        // For Google OAuth users, use default tokens from environment
        this.oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        // Use a default access token (this would be replaced with actual tokens in production)
        this.oauth2Client.setCredentials({
          access_token: 'google-oauth-access-token',
          refresh_token: 'google-oauth-refresh-token'
        });
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        return;
      }
      
      const user = await User.findById(userId);
      if (!user || !user.googleCalendarTokens) {
        throw new Error('User not found or Google Calendar not connected');
      }

      const tokens = user.googleCalendarTokens;
      
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      this.oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

      return this.oauth2Client;
    } catch (error) {
      console.error('Error initializing Google Meet client:', error);
      throw error;
    }
  }

  // Create a Google Meet session using Google Calendar API
  async createGoogleMeetSession(userId, meetingData) {
    try {
      await this.initializeClient(userId);
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const event = {
        summary: meetingData.title,
        description: meetingData.description || 'Meeting created via API',
        visibility: 'public', // allow event to be publicly accessible
        start: {
          dateTime: meetingData.startTime, // Format: '2025-10-05T10:00:00+05:30'
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: meetingData.endTime, // Format: '2025-10-05T11:00:00+05:30'
          timeZone: 'Asia/Kolkata',
        },
        attendees: meetingData.attendees?.map(attendee => ({ 
          email: attendee.email,
          displayName: attendee.name || attendee.email.split('@')[0]
        })) || [],
        // Make the Meet broadly joinable (anyone with the link can request to join)
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: true,
        anyoneCanAddSelf: true,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique request ID
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }, // 10 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1, // Required for Google Meet link
        resource: event,
      });

      console.log('Google Meet session created successfully!');
      console.log('Meet Link:', response.data.hangoutLink);
      console.log('Event ID:', response.data.id);
      
      return {
        success: true,
        meetLink: response.data.hangoutLink,
        eventId: response.data.id,
        eventDetails: response.data,
        calendarLink: response.data.htmlLink,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        attendees: response.data.attendees || []
      };
    } catch (error) {
      console.error('Error creating Google Meet session:', error);
      throw error;
    }
  }

  // Create multiple Google Meet sessions in parallel
  async createMultipleMeetSessions(userId, sessionsData) {
    try {
      const results = await Promise.all(
        sessionsData.map(session => 
          this.createGoogleMeetSession(userId, session)
        )
      );

      return {
        success: true,
        sessions: results,
        totalCreated: results.length
      };
    } catch (error) {
      console.error('Error creating multiple Google Meet sessions:', error);
      throw error;
    }
  }

  // List user's Google Calendar events
  async listCalendarEvents(userId, maxResults = 10) {
    try {
      await this.initializeClient(userId);
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        success: true,
        events: response.data.items || []
      };
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw error;
    }
  }

  // Delete a Google Calendar event
  async deleteCalendarEvent(userId, eventId) {
    try {
      await this.initializeClient(userId);
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Update a Google Calendar event
  async updateCalendarEvent(userId, eventId, updateData) {
    try {
      await this.initializeClient(userId);
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updateData,
      });

      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Check if user has Google Calendar connected
  async checkGoogleCalendarConnection(userId) {
    try {
      // Check if this is a Google OAuth user (string ID)
      if (userId && userId.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, returning connected status');
        return {
          connected: true, // Google OAuth users are always connected
          hasTokens: true
        };
      }
      
      const user = await User.findById(userId);
      return {
        connected: !!(user && user.googleCalendarConnected && user.googleCalendarTokens),
        hasTokens: !!(user && user.googleCalendarTokens)
      };
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      return { connected: false, hasTokens: false };
    }
  }

  // Refresh access token if needed
  async refreshAccessToken(userId) {
    try {
      // Check if this is a Google OAuth user (string ID)
      if (userId && userId.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, skipping token refresh');
        return {
          access_token: 'google-oauth-access-token',
          expiry_date: Date.now() + 3600000 // 1 hour from now
        };
      }
      
      await this.initializeClient(userId);
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update user's tokens in database
      await User.findByIdAndUpdate(userId, {
        'googleCalendarTokens.access_token': credentials.access_token,
        'googleCalendarTokens.expiry_date': credentials.expiry_date
      });

      return {
        success: true,
        newAccessToken: credentials.access_token
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }
}

module.exports = new GoogleMeetService();
