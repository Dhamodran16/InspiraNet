const { google } = require('googleapis');

class MeetingTracker {
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
    this.meet = google.meet({ version: 'v2', auth: this.oauth2Client });
  }

  async getParticipantData(conferenceId) {
    try {
      const participantsResponse = await this.meet.conferenceRecords.participants.list({
        parent: `conferenceRecords/${conferenceId}`
      });

      const participants = [];

      for (const participant of (participantsResponse.data.participants || [])) {
        const sessionsResponse = await this.meet.conferenceRecords.participants.participantSessions.list({
          parent: `conferenceRecords/${conferenceId}/participants/${participant.name}`
        });

        const sessions = (sessionsResponse.data.participantSessions || []).map(session => ({
          joinedAt: new Date(session.startTime),
          leftAt: new Date(session.endTime),
          duration: this.calculateDuration(session.startTime, session.endTime)
        }));

        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

        participants.push({
          email: participant?.signedinUser?.user || 'Unknown',
          name: participant?.signedinUser?.displayName || 'Unknown',
          joinTime: sessions[0]?.joinedAt,
          leaveTime: sessions[sessions.length - 1]?.leftAt,
          duration: totalDuration,
          sessions
        });
      }

      return participants;
    } catch (error) {
      console.error('Error fetching participant data:', error);
      throw error;
    }
  }

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / (1000 * 60));
  }

  calculateAttendancePercentage(participantDuration, totalMeetingDuration) {
    if (!totalMeetingDuration || totalMeetingDuration <= 0) return 0;
    return Math.round((participantDuration / totalMeetingDuration) * 100);
  }

  getAttendanceStatus(percentage) {
    if (percentage >= 75) {
      return { status: 'Present', colorCode: '#4CAF50' };
    } else if (percentage >= 50) {
      return { status: 'Partial', colorCode: '#FFC107' };
    }
    return { status: 'Absent', colorCode: '#F44336' };
  }
}

module.exports = MeetingTracker;


