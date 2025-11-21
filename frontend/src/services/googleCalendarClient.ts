// Google Calendar API Client with OAuth 2.0 Authentication
// Based on Google's official documentation and best practices

// Type declarations for Google API objects
declare const gapi: any;
declare const google: any;

declare global {
  interface Window {
    gapi: any;
    google: any;
    gapiLoaded: () => void;
    gisLoaded: () => void;
  }
}

// Google API Configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
// We intentionally do not use a browser API key to avoid discovery 400s
const API_KEY = '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

// Global variables for Google API
let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Types
export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
}

export interface GoogleMeetEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  meetLink: string;
  calendarLink: string;
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
}

// Initialize Google API
export function gapiLoaded(): void {
  gapi.load('client', initializeGapi);
}

export function initializeGapi(): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      // Initialize without API key/discovery docs; load calendar explicitly
      await gapi.client.init({}).catch(() => {});
      await gapi.client.load('calendar', 'v3');
      gapiInited = true;
      console.log('✅ Google API initialized');
      maybeEnableButtons();
    } catch (error: any) {
      console.error('❌ Error initializing Google API:', error);
    } finally {
      resolve();
    }
  });
}

async function ensureCalendarLoaded(): Promise<void> {
  if (!gapiInited) {
    await initializeGapi();
  }
  if (!gapi?.client?.calendar?.events) {
    try {
      await gapi.client.load('calendar', 'v3');
    } catch (e) {
      throw new Error('Google Calendar API failed to load. Check that Google APIs are reachable and try again.');
    }
  }
}

// Initialize Google Identity Services
export function gisLoaded(): void {
  if (!CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In is disabled until you configure it.');
    gisInited = false;
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // Will be set when needed
  });
  gisInited = true;
  console.log('✅ Google Identity Services initialized');
  maybeEnableButtons();
}

function maybeEnableButtons(): void {
  if (gapiInited && gisInited) {
    console.log('✅ Google APIs ready for authentication');
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  try {
    return gapi?.client?.getToken?.() != null;
  } catch {
    return false;
  }
}

// Get current access token
export function getAccessToken(): string | null {
  const token = gapi?.client?.getToken?.();
  return token ? token.access_token : null;
}

// Sign in with Google
export function signInWithGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('Missing VITE_GOOGLE_CLIENT_ID. Configure your Google OAuth client ID in the frontend env.'));
      return;
    }

    if (!tokenClient) {
      reject(new Error('Google Identity Services not initialized'));
      return;
    }

    tokenClient.callback = async (resp: any) => {
      try {
        if (resp && resp.error) {
          // Clear any partial tokens
          const token = gapi?.client?.getToken?.();
          if (token?.access_token) {
            try { google.accounts.oauth2.revoke(token.access_token); } catch {}
          }
          try { gapi?.client?.setToken(''); } catch {}
          reject(new Error(resp.error_description || 'Google auth was cancelled or failed'));
          return;
        }
        const token = gapi?.client?.getToken?.();
        if (!token?.access_token) {
          reject(new Error('No Google access token obtained'));
          return;
        }
        console.log('✅ Successfully authenticated with Google');
        resolve();
      } catch (e: any) {
        reject(e);
      }
    };

    if (gapi.client.getToken() === null) {
      // No token, prompt for auth
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Already signed in, refresh token
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

// Sign out
export function signOut(): void {
  const token = gapi?.client?.getToken?.();
  if (token !== null) {
    try { google.accounts.oauth2.revoke(token.access_token); } catch {}
    try { gapi.client.setToken(''); } catch {}
    console.log('✅ Signed out from Google');
  }
}

export function hasGoogleClientId(): boolean {
  return Boolean(CLIENT_ID);
}

// Create a Google Meet event
export async function createGoogleMeetEvent(eventData: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}): Promise<GoogleMeetEvent> {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in with Google first.');
  }

  const event: GoogleCalendarEvent = {
    summary: eventData.title,
    description: eventData.description || '',
    start: {
      dateTime: eventData.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: 'UTC',
    },
    attendees: eventData.attendees?.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(7), // Unique ID
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    // Make sure Calendar API is ready
    await ensureCalendarLoaded();
    console.log('📅 Creating Google Calendar event with Meet link...');
    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1, // Required for conference data
    });

    const result = response.result;
    const meetLink = result.conferenceData?.entryPoints?.[0]?.uri || result.hangoutLink;
    const calendarLink = result.htmlLink;

    if (!meetLink) {
      throw new Error('Failed to generate Google Meet link');
    }

    console.log('✅ Google Meet event created successfully');
    console.log('🔗 Meet Link:', meetLink);
    console.log('📅 Calendar Link:', calendarLink);

    return {
      id: result.id || '',
      summary: result.summary || eventData.title,
      description: result.description || eventData.description,
      start: {
        dateTime: result.start?.dateTime || eventData.startTime,
        timeZone: result.start?.timeZone || 'UTC',
      },
      end: {
        dateTime: result.end?.dateTime || eventData.endTime,
        timeZone: result.end?.timeZone || 'UTC',
      },
      meetLink,
      calendarLink,
      attendees: result.attendees,
    };
  } catch (error: any) {
    console.error('❌ Error creating Google Meet event:', error);
    throw new Error(`Failed to create meeting: ${error.message}`);
  }
}

// List user's calendar events
export async function listCalendarEvents(maxResults: number = 10): Promise<any[]> {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in with Google first.');
  }

  try {
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: maxResults,
      orderBy: 'startTime',
    });

    return response.result.items || [];
  } catch (error: any) {
    console.error('❌ Error listing calendar events:', error);
    throw new Error(`Failed to list events: ${error.message}`);
  }
}

// Delete a calendar event
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in with Google first.');
  }

  try {
    await gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    console.log('✅ Calendar event deleted successfully');
  } catch (error: any) {
    console.error('❌ Error deleting calendar event:', error);
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}

// Get user's calendar info
export async function getCalendarInfo(): Promise<any> {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in with Google first.');
  }

  try {
    const response = await gapi.client.calendar.calendarList.get({
      calendarId: 'primary',
    });
    return response.result;
  } catch (error: any) {
    console.error('❌ Error getting calendar info:', error);
    throw new Error(`Failed to get calendar info: ${error.message}`);
  }
}

// Initialize Google APIs when the page loads
export function initializeGoogleAPIs(): void {
  const MAX_WAIT_MS = 15000;
  const start = Date.now();

  const tryInit = () => {
    const gapiReady = typeof gapi !== 'undefined' && gapi?.load;
    const gisReady = typeof google !== 'undefined' && google?.accounts?.oauth2;

    if (gapiReady) {
      gapiLoaded();
    }
    if (gisReady) {
      gisLoaded();
    }

    if (!(gapiReady && gisReady)) {
      if (Date.now() - start < MAX_WAIT_MS) {
        setTimeout(tryInit, 200);
      } else {
        console.warn('Google APIs not fully loaded within timeout.');
      }
    }
  };

  tryInit();
}

// Make functions available globally for script loading
if (typeof window !== 'undefined') {
  window.gapiLoaded = gapiLoaded;
  window.gisLoaded = gisLoaded;
}

