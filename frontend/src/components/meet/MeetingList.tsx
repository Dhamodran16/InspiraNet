import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Calendar, Users } from 'lucide-react';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: number;
  status: string;
}

interface MeetingListProps {
  meetings: Meeting[];
  onJoin: (meeting: Meeting) => void;
}

export default function MeetingList({ meetings, onJoin }: MeetingListProps) {
  if (!meetings || meetings.length === 0) {
    return <div className="p-4 text-muted-foreground">No meetings scheduled.</div>;
  }
  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-4 w-4" />
              {meeting.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm flex gap-4">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{meeting.date} {meeting.time}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{meeting.participants}</span>
            </div>
            <Button onClick={() => onJoin(meeting)}>Join</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
