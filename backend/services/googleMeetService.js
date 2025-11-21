const { google } = require('googleapis');
const User = require('../models/User');

class GoogleMeetService {
  constructor() {
    this.oauth2Client = null;
  }

  // Initialize OAuth2 client with user's tokens
  async initializeClient(userId) {
    try {
      // Convert userId to string for comparison
      const userIdStr = userId ? userId.toString() : '';
      
      // Check if this is a Google OAuth user (string ID)
      if (userIdStr && userIdStr.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, using default tokens');
        this.oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        this.oauth2Client.setCredentials({
          access_token: 'google-oauth-access-token',
          refresh_token: 'google-oauth-refresh-token'
        });
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        return;
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.googleCalendarTokens || !user.googleCalendarTokens.access_token) {
        throw new Error('Google Calendar not connected. Please connect your Google Calendar account first.');
      }

      const tokens = user.googleCalendarTokens;
      
      // Check if access token is expired and refresh if needed
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.log('Access token expired, refreshing...');
        try {
          await this.refreshAccessToken(userId);
          // Reload user to get new tokens
          const refreshedUser = await User.findById(userId);
          if (refreshedUser && refreshedUser.googleCalendarTokens) {
            tokens.access_token = refreshedUser.googleCalendarTokens.access_token;
            tokens.expiry_date = refreshedUser.googleCalendarTokens.expiry_date;
          }
        } catch (refreshError) {
          console.error('Error refreshing access token:', refreshError);
          
          // If it's an invalid_grant error, the refreshAccessToken method already cleared tokens
          // Just throw a user-friendly error
          if (refreshError.message && refreshError.message.includes('revoked')) {
            throw refreshError; // Re-throw the error from refreshAccessToken
          }
          
          throw new Error('Failed to refresh access token. Please reconnect your Google Calendar account.');
        }
      }
      
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
      console.log('Creating Google Meet session for userId:', userId);
      console.log('Meeting data:', {
        title: meetingData.title,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime
      });
      
      await this.initializeClient(userId);
      
      if (!this.oauth2Client) {
        throw new Error('Failed to initialize OAuth2 client');
      }
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Ensure dates are in ISO format
      const startDateTime = new Date(meetingData.startTime).toISOString();
      const endDateTime = new Date(meetingData.endTime).toISOString();
      
      console.log('Formatted dates:', { startDateTime, endDateTime });
      
      const event = {
        summary: meetingData.title,
        description: meetingData.description || 'Meeting created via API',
        visibility: 'public',
        start: {
          dateTime: startDateTime,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Asia/Kolkata',
        },
        attendees: meetingData.attendees?.map(attendee => ({ 
          email: attendee.email,
          displayName: attendee.name || attendee.email.split('@')[0]
        })) || [],
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: true,
        anyoneCanAddSelf: true,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      console.log('Inserting calendar event...');
      const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
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
        attendees: response.data.attendees || [],
        conferenceId: response.data.conferenceData?.conferenceId || null
      };
    } catch (error) {
      console.error('Error creating Google Meet session:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Provide more specific error messages
      if (error.message && error.message.includes('revoked')) {
        throw error; // Re-throw the revoked error as-is
      } else if (error.message && error.message.includes('invalid_grant')) {
        throw new Error('Google Calendar access has been revoked. Please reconnect your Google Calendar account.');
      } else if (error.code === 401) {
        throw new Error('Google Calendar authentication failed. Please reconnect your Google Calendar account.');
      } else if (error.code === 403) {
        throw new Error('Insufficient permissions for Google Calendar. Please check your Google Calendar permissions.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to create Google Meet session. Please try again.');
      }
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
      // Convert userId to string for comparison
      const userIdStr = userId ? userId.toString() : '';
      
      if (userIdStr && userIdStr.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, returning connected status');
        return {
          connected: true,
          hasTokens: true
        };
      }
      
      const user = await User.findById(userId);
      if (!user) {
        console.log('User not found for userId:', userId);
        return {
          connected: false,
          hasTokens: false
        };
      }
      
      // Check if tokens exist and have required fields
      const hasTokens = !!(user.googleCalendarTokens && user.googleCalendarTokens.access_token);
      const connected = !!(user.googleCalendarConnected && hasTokens);
      
      console.log('User Google Calendar status:', {
        userId: userIdStr,
        googleCalendarConnected: user.googleCalendarConnected,
        hasTokens: hasTokens,
        hasAccessToken: !!(user.googleCalendarTokens?.access_token),
        hasRefreshToken: !!(user.googleCalendarTokens?.refresh_token),
        tokensObject: user.googleCalendarTokens ? 'exists' : 'null',
        connected: connected
      });
      
      return {
        connected: connected,
        hasTokens: hasTokens
      };
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      return { connected: false, hasTokens: false };
    }
  }

  // Refresh access token if needed
  async refreshAccessToken(userId) {
    try {
      // Convert userId to string for comparison
      const userIdStr = userId ? userId.toString() : '';
      if (userIdStr && userIdStr.startsWith('google-user-')) {
        console.log('Google Meet Service - Google OAuth user detected, skipping token refresh');
        return {
          access_token: 'google-oauth-access-token',
          expiry_date: Date.now() + 3600000
        };
      }
      
      const user = await User.findById(userId);
      if (!user || !user.googleCalendarTokens || !user.googleCalendarTokens.refresh_token) {
        throw new Error('No refresh token available. Please reconnect your Google Calendar account.');
      }
      
      // Create a temporary OAuth2 client for token refresh
      const tempOAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      tempOAuth2Client.setCredentials({
        refresh_token: user.googleCalendarTokens.refresh_token
      });
      
      const { credentials } = await tempOAuth2Client.refreshAccessToken();
      
      // Update user's tokens in database
      await User.findByIdAndUpdate(userId, {
        $set: {
          'googleCalendarTokens.access_token': credentials.access_token,
          'googleCalendarTokens.expiry_date': credentials.expiry_date
        }
      });

      console.log('Access token refreshed successfully');
      return {
        success: true,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Check for invalid_grant error in various formats
      const isInvalidGrant = 
        error.message?.includes('invalid_grant') ||
        error.code === 'invalid_grant' ||
        error.response?.data?.error === 'invalid_grant' ||
        error.response?.data?.error_description?.includes('invalid_grant');
      
      if (isInvalidGrant) {
        console.log('Invalid grant error detected - clearing user tokens');
        
        // Clear user's Google Calendar tokens and mark as disconnected
        await User.findByIdAndUpdate(userId, {
          $set: {
            googleCalendarConnected: false,
            'googleCalendarTokens.access_token': null,
            'googleCalendarTokens.refresh_token': null,
            'googleCalendarTokens.expiry_date': null
          }
        });
        
        throw new Error('Google Calendar access has been revoked. Please reconnect your Google Calendar account.');
      }
      
      throw error;
    }
  }
}

module.exports = new GoogleMeetService();

