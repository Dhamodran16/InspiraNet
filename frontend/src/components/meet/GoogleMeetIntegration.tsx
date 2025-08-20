import React, { useState } from 'react';
import MeetingList, { Meeting } from './MeetingList';
import MeetingRoom from './MeetingRoom';
import JitsiMeetRoom from './JitsiMeetRoom';
import { useAuth } from '@/contexts/AuthContext';

const mockMeetings: Meeting[] = [
  { id: '1', title: 'Alumni Career Guidance', date: '2024-07-01', time: '10:00 AM', participants: 12, status: 'upcoming' },
  { id: '2', title: 'Placement Workshop', date: '2024-07-05', time: '2:00 PM', participants: 20, status: 'upcoming' },
  { id: '3', title: 'Past Networking', date: '2024-06-01', time: '6:00 PM', participants: 30, status: 'completed' },
];

const mockParticipants = [
  { id: '1', name: 'Sarah Wilson', avatar: '/placeholder.svg', role: 'Faculty' },
  { id: '2', name: 'Mike Chen', avatar: '/placeholder.svg', role: 'Student' },
  { id: '3', name: 'Priya Sharma', avatar: '/placeholder.svg', role: 'Alumni' },
];

export default function GoogleMeetIntegration() {
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [jitsiRoom, setJitsiRoom] = useState<string | null>(null);
  const { user } = useAuth();

  if (jitsiRoom) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button className="mb-4 btn btn-outline" onClick={() => setJitsiRoom(null)}>Back to Meetings</button>
        <JitsiMeetRoom roomName={jitsiRoom} userName={user?.name || 'User'} />
      </div>
    );
  }

  if (activeMeeting) {
    return (
      <MeetingRoom
        meetingTitle={activeMeeting.title}
        participants={mockParticipants}
        onLeaveMeeting={() => setActiveMeeting(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-4">Virtual Meetings</h1>
      <button
        className="mb-4 btn btn-primary"
        onClick={() => setJitsiRoom(`AlumniNetworkRoom_${Date.now()}`)}
      >
        Start Jitsi Meeting
      </button>
      <MeetingList meetings={mockMeetings} onJoin={setActiveMeeting} />
    </div>
  );
}