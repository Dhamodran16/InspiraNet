import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Settings, 
  MoreVertical,
  MessageSquare,
  Users,
  Share,
  Hand
} from "lucide-react";

interface MeetingRoomProps {
  meetingTitle: string;
  participants: { id: string; name: string; avatar?: string; role: string }[];
  onLeaveMeeting: () => void;
}

const MeetingRoom = ({ meetingTitle, participants, onLeaveMeeting }: MeetingRoomProps) => {
  // Load user data from localStorage
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const userName = userInfo.name || "User";
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: userName, message: "Welcome to the career guidance session!", time: "10:00 AM" },
    { id: 2, sender: "Sarah Wilson", message: "Thank you for joining everyone", time: "10:01 AM" }
  ]);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatMessages([...chatMessages, {
        id: chatMessages.length + 1,
        sender: "You",
        message: chatMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setChatMessage("");
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-medium">{meetingTitle}</h1>
          <p className="text-sm text-gray-300">{participants.length} participants</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-400 border-green-400">
            Live
          </Badge>
          <span className="text-sm text-gray-300">Recording</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
            {/* Main Speaker */}
            <Card className="col-span-2 lg:col-span-2 bg-gray-800 border-gray-700 relative">
              <CardContent className="p-0 h-full flex items-center justify-center">
                <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="text-2xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="font-medium">{userName} (Host)</div>
                    <div className="text-sm opacity-75">Alumni • Software Engineer</div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="text-white border-white">
                      Host
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            {participants.slice(0, 6).map((participant) => (
              <Card key={participant.id} className="bg-gray-800 border-gray-700 relative">
                <CardContent className="p-0 h-full flex items-center justify-center">
                  <div className="relative w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>{participant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-2 left-2 text-white">
                      <div className="text-sm font-medium">{participant.name}</div>
                      <div className="text-xs opacity-75">{participant.role}</div>
                    </div>
                    {Math.random() > 0.5 && (
                      <div className="absolute top-2 right-2">
                        <MicOff className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium">Meeting Chat</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{msg.sender}</span>
                    <span className="text-xs text-gray-500">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>Send</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12"
          >
            <Share className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12"
          >
            <Hand className="h-5 w-5" />
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={onLeaveMeeting}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            Meeting ID: 123-456-789 | {new Date().toLocaleTimeString()} | {participants.length} participants
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;