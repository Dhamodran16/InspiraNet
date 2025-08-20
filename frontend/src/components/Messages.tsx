import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Send } from 'lucide-react';

export default function Messages() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Messages</h1>
          <p className="text-lg text-muted-foreground">
            Connect and chat with your alumni network
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The messaging feature is currently under development. Soon you'll be able to:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Chat with fellow alumni
              </li>
              <li className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send text messages and media
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Create group conversations
              </li>
            </ul>
            <div className="mt-6 flex gap-2">
              <Button disabled>
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
              <Button variant="outline" disabled>
                <Users className="h-4 w-4 mr-2" />
                Group Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}