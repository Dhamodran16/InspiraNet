// Google API Type Declarations
// This file provides TypeScript definitions for Google API objects

declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
    gapiLoaded: () => void;
    gisLoaded: () => void;
  }
}

// Google API Client Library (gapi)
declare namespace gapi {
  function load(api: string, callback: () => void): void;
  
  namespace client {
    function init(config: {
      apiKey?: string;
      discoveryDocs?: string[];
    }): Promise<void>;
    
    function getToken(): { access_token: string; expires_in: number } | null;
    function setToken(token: string | null): void;
    
    namespace calendar {
      namespace events {
        function insert(params: {
          calendarId: string;
          resource: any;
          conferenceDataVersion?: number;
        }): Promise<{ result: any }>;
        
        function list(params: {
          calendarId: string;
          timeMin?: string;
          showDeleted?: boolean;
          singleEvents?: boolean;
          maxResults?: number;
          orderBy?: string;
        }): Promise<{ result: { items?: any[] } }>;
        
        function delete(params: {
          calendarId: string;
          eventId: string;
        }): Promise<void>;
      }
      
      namespace calendarList {
        function get(params: {
          calendarId: string;
        }): Promise<{ result: any }>;
      }
    }
  }
}

// Google Identity Services (google)
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        callback: (response: any) => void;
        requestAccessToken: (options: { prompt?: string }) => void;
      }
      
      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: string;
      }): TokenClient;
      
      function revoke(token: string): void;
    }
  }
}

export {};
