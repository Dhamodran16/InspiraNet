import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Users, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  LogOut, 
  Menu, 
  X, 
  User,
  Building2,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socketService } from "@/services/socketService";
import ServerStatusIndicator from "@/components/ServerStatusIndicator";

interface SidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ currentSection, onSectionChange, onLogout, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, logout } = useAuth();
  
  const userName = user?.name || "User";

  // Notify parent component when collapse state changes
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  const navItems = [
    { id: "home", name: "Home", icon: Home, description: "Dashboard overview" },
    { id: "network", name: "My Network", icon: Users, description: "Connect with alumni" },
    { id: "messages", name: "Messages", icon: MessageSquare, description: "Chat with connections" },
    { id: "notifications", name: "Notifications", icon: Bell, description: "Stay updated" },
    { id: "placements", name: "Placements", icon: Briefcase, description: "Career opportunities" },
    { id: "meetings", name: "Virtual Meetings", icon: Building2, description: "Online discussions" }
  ];

  // Initial counts from API and real-time updates for unread counts
  useEffect(() => {
    if (user) {
      // Fetch initial counts
      (async () => {
        try {
          const api = (await import('@/services/api')).default;
          const convRes = await api.get('/api/conversations');
          const conversations = convRes.data.conversations || [];
          const userId = user._id;
          const totalUnread = conversations.reduce((acc: number, c: any) => {
            try {
              if (c.unreadCount && typeof c.unreadCount.get === 'function') {
                return acc + (c.unreadCount.get(userId) || 0);
              }
              if (c.unreadCount && typeof c.unreadCount === 'object') {
                return acc + (c.unreadCount[userId] || 0);
              }
            } catch {}
            return acc;
          }, 0);
          setUnreadMessages(totalUnread);

          const notifRes = await api.get('/api/notifications/unread-count');
          setUnreadNotifications(notifRes.data.count || 0);
        } catch (e) {
          // ignore
        }
      })();

      // Listen for new messages
      const handleNewMessage = (data: any) => {
        if (data.senderId !== user._id) {
          setUnreadMessages(prev => prev + 1);
        }
      };

      // Listen for new notifications
      const handleNewNotification = (data: any) => {
        setUnreadNotifications(prev => prev + 1);
      };

      // Listen for message read status
      const handleMessageRead = () => {
        // For simplicity, decrement to zero on any read event
        setUnreadMessages(0);
      };

      // Listen for notification read status
      const handleNotificationRead = () => {
        setUnreadNotifications(0);
      };

      socketService.onMessage(handleNewMessage);
      socketService.onNewNotification(handleNewNotification);
      socketService.onMessagesRead(handleMessageRead);
      socketService.onNotificationRead(handleNotificationRead);

      // Also adjust counts when follow status changes (new conversations may appear)
      socketService.onFollowStatusUpdate(() => {
        // Re-fetch minimal counts
        (async () => {
          try {
            const api = (await import('@/services/api')).default;
            const convRes = await api.get('/api/conversations');
            const conversations = convRes.data.conversations || [];
            const userId = user._id;
            const totalUnread = conversations.reduce((acc: number, c: any) => {
              try {
                if (c.unreadCount && typeof c.unreadCount.get === 'function') {
                  return acc + (c.unreadCount.get(userId) || 0);
                }
                if (c.unreadCount && typeof c.unreadCount === 'object') {
                  return acc + (c.unreadCount[userId] || 0);
                }
              } catch {}
              return acc;
            }, 0);
            setUnreadMessages(totalUnread);
          } catch {}
        })();
      });

      return () => {
        socketService.offMessage();
        socketService.offNewNotification();
        socketService.offMessagesRead();
        socketService.offNotificationRead();
        socketService.offFollowStatusUpdate();
      };
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div className={cn(
      "dashboard-sidebar",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Header Section */}
      <div className="flex-shrink-0 p-6 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/favicon.png" 
                alt="KEC Alumni Network Logo" 
                className={cn(
                  "rounded-xl shadow-lg transition-all duration-300",
                  isCollapsed ? "h-10 w-10" : "h-12 w-12"
                )}
              />
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground leading-tight">KEC Alumni</span>
                <span className="text-sm font-medium text-muted-foreground leading-tight">Network</span>
              </div>
            )}
          </div>
          
          {/* Notification Bell and Collapse Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "h-8 w-8 p-0 hover:bg-accent rounded-lg transition-all duration-200",
                isCollapsed ? "mx-auto" : ""
              )}
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Server Status */}
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <ServerStatusIndicator />
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-background/60">
        <div 
          className={cn(
            "flex items-center cursor-pointer hover:bg-accent/50 hover:text-accent-foreground p-3 rounded-xl transition-all duration-200 group",
            isCollapsed ? "justify-center" : "space-x-3"
          )}
          onClick={() => onSectionChange("profile")}
        >
          <Avatar className={cn(
            "transition-all duration-200",
            isCollapsed ? "h-10 w-10" : "h-12 w-12"
          )}>
            <AvatarImage src={user?.avatar || "/placeholder.svg"} alt="User" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground text-base truncate">{userName}</div>
              <div className="text-sm text-muted-foreground truncate">
                {user?.type || "Alumni"} • {user?.joinYear || user?.batch || "2020"}
              </div>
            </div>
          )}
          
          {!isCollapsed && (
            <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
              Profile
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentSection === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-foreground relative h-12 text-sm font-medium transition-all duration-200 group",
                  currentSection === item.id 
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md border border-secondary/50" 
                    : "hover:bg-accent/50 hover:text-accent-foreground"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <div className={cn(
                  "flex items-center w-full",
                  isCollapsed ? "justify-center" : "justify-start"
                )}>
                  <item.icon className={cn(
                    "transition-all duration-200",
                    isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
                  )} />
                  
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      
                      {/* Unread count badges */}
                      {item.id === "messages" && unreadMessages > 0 && (
                        <Badge variant="destructive" className="ml-2 h-6 w-6 p-0 text-xs font-bold flex items-center justify-center">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </Badge>
                      )}
                      {item.id === "notifications" && unreadNotifications > 0 && (
                        <Badge variant="destructive" className="ml-2 h-6 w-6 p-0 text-xs font-bold flex items-center justify-center">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Active indicator */}
                {currentSection === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </nav>

      {/* Footer Actions Section */}
      <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background/80">
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-foreground hover:bg-accent/50 hover:text-accent-foreground h-12 text-sm font-medium transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start"
            )}
            onClick={() => onSectionChange("settings")}
          >
            <User className={cn(
              "transition-all duration-200",
              isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
            )} />
            {!isCollapsed && <span className="font-medium">Settings</span>}
          </Button>
          
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-foreground hover:bg-destructive/10 hover:text-destructive h-12 text-sm font-medium transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start"
            )}
            onClick={handleLogout}
          >
            <LogOut className={cn(
              "transition-all duration-200",
              isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
            )} />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
