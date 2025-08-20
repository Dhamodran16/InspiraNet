import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function Events() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Events</h1>
          <p className="text-lg text-muted-foreground">
            Stay updated with the latest events and gatherings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The events feature is currently under development. Check back soon for exciting alumni events, 
              networking opportunities, and professional development sessions.
            </p>
            <div className="mt-4 flex gap-2">
              <Button disabled>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
              <Button variant="outline" disabled>
                <Users className="h-4 w-4 mr-2" />
                Join Event
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}