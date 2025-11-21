const { google } = require('googleapis');
const User = require('../models/User');
const Meeting = require('../models/Meeting');

class AttendanceTrackingService {
  /**
   * Initialize Google Calendar API client
   */
  async initializeClient(userId) {
    try {
      const userIdStr = userId ? userId.toString() : '';
      
      if (userIdStr && userIdStr.startsWith('google-user-')) {
        throw new Error('Google OAuth user not supported for attendance tracking');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.googleCalendarTokens || !user.googleCalendarTokens.access_token) {
        throw new Error('Google Calendar not connected');
      }

      const tokens = user.googleCalendarTokens;
      
      // Refresh token if expired
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        oauth2Client.setCredentials({
          refresh_token: tokens.refresh_token
        });
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        await User.findByIdAndUpdate(userId, {
          $set: {
            'googleCalendarTokens.access_token': credentials.access_token,
            'googleCalendarTokens.expiry_date': credentials.expiry_date
          }
        });
        
        tokens.access_token = credentials.access_token;
        tokens.expiry_date = credentials.expiry_date;
      }
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      console.error('Error initializing attendance tracking client:', error);
      throw error;
    }
  }

  /**
   * Fetch actual attendance from Google Calendar event
   * This gets real-time participant data from the Google Calendar event
   */
  async fetchAttendanceFromGoogleCalendar(userId, eventId) {
    try {
      const calendar = await this.initializeClient(userId);
      
      // Get the event details
      const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const eventData = event.data;
      const attendees = eventData.attendees || [];
      
      // Get current time and event times
      const now = new Date();
      const eventStart = new Date(eventData.start.dateTime || eventData.start.date);
      const eventEnd = new Date(eventData.end.dateTime || eventData.end.date);
      const meetingDuration = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60));

      // Process attendees
      const attendance = attendees.map(attendee => {
        const email = attendee.email;
        const name = attendee.displayName || email.split('@')[0];
        const responseStatus = attendee.responseStatus || 'needsAction';
        
        // Determine attendance status based on response
        // 'accepted' means they accepted the invite (likely present)
        // 'declined' means they declined (absent)
        // 'tentative' means maybe (partial)
        // 'needsAction' means no response (unknown)
        
        let attendanceStatus = 'Absent';
        let attendancePercentage = 0;
        
        if (responseStatus === 'accepted') {
          // If they accepted, assume they attended
          // For more accuracy, we'd need Google Meet API which requires special permissions
          attendanceStatus = 'Present';
          attendancePercentage = 100;
        } else if (responseStatus === 'tentative') {
          attendanceStatus = 'Partial';
          attendancePercentage = 50;
        } else if (responseStatus === 'declined') {
          attendanceStatus = 'Absent';
          attendancePercentage = 0;
        } else {
          // needsAction - unknown status
          attendanceStatus = 'Absent';
          attendancePercentage = 0;
        }

        return {
          email: email,
          name: name,
          joinTime: responseStatus === 'accepted' ? eventStart : null,
          leaveTime: responseStatus === 'accepted' ? eventEnd : null,
          duration: responseStatus === 'accepted' ? meetingDuration : 0,
          sessions: responseStatus === 'accepted' ? [{
            joinedAt: eventStart,
            leftAt: eventEnd,
            duration: meetingDuration
          }] : [],
          attendancePercentage: attendancePercentage,
          attendanceStatus: attendanceStatus,
          statusColor: attendanceStatus === 'Present' ? 'green' : attendanceStatus === 'Partial' ? 'yellow' : 'red',
          responseStatus: responseStatus // Store original response status
        };
      });

      // Calculate summary
      const summary = {
        totalParticipants: attendance.length,
        presentCount: attendance.filter(a => a.attendanceStatus === 'Present').length,
        partialCount: attendance.filter(a => a.attendanceStatus === 'Partial').length,
        absentCount: attendance.filter(a => a.attendanceStatus === 'Absent').length
      };

      return {
        attendance,
        summary,
        meetingDuration,
        fetchedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching attendance from Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Process and save attendance for a meeting
   * This combines Google Calendar data with any manual logs
   */
  async processMeetingAttendance(meetingId, userId) {
    try {
      const meeting = await Meeting.findOne({ id: meetingId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Verify user is the host
      if (meeting.host_id.toString() !== userId.toString()) {
        throw new Error('Only the meeting host can process attendance');
      }

      let attendance = [];
      let summary = {
        totalParticipants: 0,
        presentCount: 0,
        partialCount: 0,
        absentCount: 0
      };

      // Try to fetch from Google Calendar first (most accurate)
      try {
        const googleData = await this.fetchAttendanceFromGoogleCalendar(userId, meeting.event_id);
        attendance = googleData.attendance;
        summary = googleData.summary;
        
        console.log('✅ Fetched attendance from Google Calendar:', {
          total: attendance.length,
          present: summary.presentCount,
          partial: summary.partialCount,
          absent: summary.absentCount
        });
      } catch (googleError) {
        console.warn('⚠️ Could not fetch from Google Calendar, using fallback methods:', googleError.message);
        
        // Fallback: Use attendance_logs if available
        if (meeting.attendance_logs && meeting.attendance_logs.length > 0) {
          const meetingDuration = meeting.end_time && meeting.start_time
            ? Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / (1000 * 60))
            : 0;

          const meetingStartTime = meeting.start_time ? new Date(meeting.start_time) : null;
          const meetingEndTime = meeting.end_time ? new Date(meeting.end_time) : null;

          attendance = meeting.attendance_logs.map(log => {
            const joinEvents = log.events.filter(e => e.type === 'join');
            const leaveEvents = log.events.filter(e => e.type === 'leave');
            
            // Get join time: use first join event, or infer from meeting start if only leave events exist
            let joinTime = joinEvents.length > 0 ? new Date(joinEvents[0].timestamp) : null;
            const leaveTime = leaveEvents.length > 0 ? new Date(leaveEvents[leaveEvents.length - 1].timestamp) : null;
            
            // If we have a leave time but no join time, infer join time from meeting start
            if (!joinTime && leaveTime) {
              if (meetingStartTime && meetingStartTime <= leaveTime) {
                joinTime = meetingStartTime;
              } else {
                joinTime = leaveTime;
              }
            }
            
            // Calculate duration
            let duration = 0;
            if (joinTime && leaveTime) {
              duration = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));
            } else if (joinTime && meetingEndTime) {
              duration = Math.round((meetingEndTime.getTime() - joinTime.getTime()) / (1000 * 60));
            } else if (joinTime && !meetingEndTime) {
              duration = meetingDuration;
            } else if (leaveTime && meetingStartTime) {
              duration = Math.round((leaveTime.getTime() - meetingStartTime.getTime()) / (1000 * 60));
            }

            duration = Math.max(0, duration);

            const attendancePercentage = meetingDuration > 0 
              ? Math.round((duration / meetingDuration) * 100) 
              : (duration > 0 ? 100 : 0);

            let attendanceStatus = 'Absent';
            if (attendancePercentage >= 80) {
              attendanceStatus = 'Present';
            } else if (attendancePercentage >= 30) {
              attendanceStatus = 'Partial';
            } else if (duration > 0) {
              attendanceStatus = 'Partial';
            }

            return {
              email: log.email,
              name: log.name || log.email.split('@')[0],
              joinTime: joinTime ? joinTime.toISOString() : null,
              leaveTime: leaveTime ? leaveTime.toISOString() : null,
              duration: duration,
              sessions: joinEvents.map((join, idx) => ({
                joinedAt: join.timestamp,
                leftAt: leaveEvents[idx]?.timestamp || null,
                duration: leaveEvents[idx] 
                  ? Math.round((new Date(leaveEvents[idx].timestamp) - new Date(join.timestamp)) / (1000 * 60))
                  : 0
              })),
              attendancePercentage: attendancePercentage,
              attendanceStatus: attendanceStatus,
              statusColor: attendanceStatus === 'Present' ? 'green' : attendanceStatus === 'Partial' ? 'yellow' : 'red'
            };
          });

          summary = {
            totalParticipants: attendance.length,
            presentCount: attendance.filter(a => a.attendanceStatus === 'Present').length,
            partialCount: attendance.filter(a => a.attendanceStatus === 'Partial').length,
            absentCount: attendance.filter(a => a.attendanceStatus === 'Absent').length
          };
        } 
        // Final fallback: Use expected attendees
        else if (meeting.expected_attendees && meeting.expected_attendees.length > 0) {
          attendance = meeting.expected_attendees.map(attendee => ({
            email: attendee.email,
            name: attendee.name || attendee.email.split('@')[0],
            joinTime: null,
            leaveTime: null,
            duration: 0,
            sessions: [],
            attendancePercentage: 0,
            attendanceStatus: 'Absent',
            statusColor: 'red'
          }));

          summary = {
            totalParticipants: attendance.length,
            presentCount: 0,
            partialCount: 0,
            absentCount: attendance.length
          };
        }
      }

      // Calculate meeting duration
      const meetingDuration = meeting.end_time && meeting.start_time
        ? Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / (1000 * 60))
        : 0;

      // Update meeting with attendance data
      meeting.attendance = attendance;
      meeting.attendance_summary = summary;
      meeting.total_duration = meetingDuration;
      meeting.attendance_processed_at = new Date();
      meeting.status = 'completed';
      
      await meeting.save();

      return {
        success: true,
        attendance,
        summary,
        meetingDuration
      };
    } catch (error) {
      console.error('Error processing meeting attendance:', error);
      throw error;
    }
  }

  /**
   * Check if meeting link is expired (1 hour after start time)
   */
  isMeetingLinkExpired(meeting) {
    if (!meeting.start_time) {
      return false;
    }
    
    const startTime = new Date(meeting.start_time);
    const expirationTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // 1 hour
    const now = new Date();
    
    return now > expirationTime;
  }

  /**
   * Get meeting with expiration status
   */
  getMeetingWithExpirationStatus(meeting) {
    const isExpired = this.isMeetingLinkExpired(meeting);
    return {
      ...meeting.toObject(),
      linkExpired: isExpired,
      linkExpiresAt: meeting.start_time 
        ? new Date(new Date(meeting.start_time).getTime() + (60 * 60 * 1000))
        : null
    };
  }
}

module.exports = new AttendanceTrackingService();

