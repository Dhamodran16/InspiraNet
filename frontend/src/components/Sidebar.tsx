import React, { useState, useEffect } from "react";
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
  User,
  Building2,
  Bell,
  Settings,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socketService } from "@/services/socketService";

interface SidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ currentSection, onSectionChange, onLogout, onCollapseChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user, logout } = useAuth();
  
  const userName = user?.name || "User";

  // Get current year for fallback
  const currentYear = new Date().getFullYear();
  
  // Get user year display - only for students
  const getUserYearDisplay = () => {
    if (user?.type !== 'student') return null;
    if (user?.studentInfo?.batch) return user.studentInfo.batch;
    return currentYear;
  };

  // Get user department/company display
  const getUserDepartmentDisplay = () => {
    if (user?.type === 'alumni') {
      return user.alumniInfo?.currentCompany || 'Alumni';
    }
    if (user?.type === 'faculty') {
      return user.facultyInfo?.department || user.department || 'Faculty';
    }
    if (user?.type === 'student') {
      return user.studentInfo?.department || user.department || 'Student';
    }
    return 'User';
  };

  const navItems = [
    { id: "home", name: "Home", icon: Home, description: "Dashboard overview" },
    { id: "network", name: "My Network", icon: Users, description: "Connect with alumni" },
    { id: "messages", name: "Messages", icon: MessageSquare, description: "Chat with connections" },
    { id: "notifications", name: "Notifications", icon: Bell, description: "Stay updated" },
    { id: "placements", name: "Placements", icon: Briefcase, description: "Career opportunities" },
    { id: "meetings", name: "Google Meeting", icon: Video, description: "Google Meet sessions" }
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
    <div
      className={cn(
        "sidebar-theme fixed left-0 top-0 h-screen bg-background text-foreground transition-all duration-700 ease-out z-50 border border-border shadow-lg backdrop-blur-sm",
        isHovered ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'translateX(0)' : 'translateX(0)',
        filter: isHovered ? 'drop-shadow(0 20px 25px rgb(0 0 0 / 0.1))' : 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.05))'
      }}
    >
      {/* Header Section */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className={cn(
          "flex items-center transition-all duration-500 ease-out",
          isHovered ? "justify-start" : "justify-center"
        )}>
          <div className="relative group">
            <img
              src="/favicon.png"
              alt="KEC Alumni Network Logo"
              className={cn(
                "rounded-lg shadow-lg transition-all duration-500 ease-out transform group-hover:scale-110",
                isHovered ? "h-10 w-10" : "h-8 w-8"
              )}
            />
            {/* Online indicator with pulse animation */}
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          {isHovered && (
            <div className="ml-3 flex flex-col animate-in slide-in-from-left-3 duration-500 ease-out">
              <span className="text-lg font-bold leading-tight text-foreground bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                KEC Alumni
              </span>
              <span className="text-xs text-muted-foreground leading-tight">Network</span>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-900">
        <div
          className={cn(
            "flex items-center cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 p-3 rounded-xl transition-all duration-500 ease-out group transform hover:scale-105",
            isHovered ? "justify-start space-x-3" : "justify-center"
          )}
          onClick={() => onSectionChange("profile")}
        >
          <Avatar className={cn(
            "transition-all duration-500 ease-out ring-2 ring-transparent group-hover:ring-purple-200",
            isHovered ? "h-10 w-10" : "h-8 w-8"
          )}>
            <AvatarImage src={user?.avatar || "/placeholder.svg"} alt="User" />
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm">
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          {isHovered && (
            <div className="flex-1 min-w-0 animate-in slide-in-from-left-3 duration-500 ease-out">
              <div className="font-semibold text-sm truncate text-foreground group-hover:text-purple-700 transition-colors duration-300">
                {userName}
              </div>
              <div className="text-xs text-muted-foreground truncate group-hover:text-muted-foreground transition-colors duration-300">
                {getUserDepartmentDisplay()}
                {getUserYearDisplay() && ` • ${getUserYearDisplay()}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-muted-foreground hover:text-foreground relative h-12 text-sm font-medium transition-all duration-500 ease-out group transform hover:scale-105",
                  currentSection === item.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg rounded-xl"
                    : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 rounded-xl dark:hover:from-slate-900 dark:hover:to-slate-800"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <div className={cn(
                  "flex items-center w-full transition-all duration-500 ease-out",
                  isHovered ? "justify-start" : "justify-center"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110",
                    currentSection === item.id ? "text-white" : "text-muted-foreground group-hover:text-purple-600"
                  )} />

                  {isHovered && (
                    <div className="flex-1 flex items-center justify-between ml-3 animate-in slide-in-from-left-3 duration-500 ease-out">
                      <span className="font-medium transition-colors duration-300 group-hover:text-foreground">
                        {item.name}
                      </span>

                      {/* Unread count badges with enhanced animations */}
                      {item.id === "messages" && unreadMessages > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs font-bold flex items-center justify-center animate-in zoom-in-75 duration-500 ease-out shadow-lg">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </Badge>
                      )}
                      {item.id === "notifications" && unreadNotifications > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs font-bold flex items-center justify-center animate-in zoom-in-75 duration-500 ease-out shadow-lg">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </nav>

      {/* Footer Actions Section - Fixed at bottom */}
      <div className="flex-shrink-0 p-2 border-t border-border bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-purple-700 h-12 text-sm font-medium transition-all duration-500 ease-out hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 rounded-xl transform hover:scale-105 group dark:hover:from-slate-900 dark:hover:to-slate-800",
              isHovered ? "justify-start" : "justify-center"
            )}
            onClick={() => onSectionChange("settings")}
          >
            <Settings className="h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-purple-600" />
            {isHovered && (
              <span className="font-medium ml-3 animate-in slide-in-from-left-3 duration-500 ease-out transition-colors duration-300 group-hover:text-purple-700">
                Settings
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-red-600 h-12 text-sm font-medium transition-all duration-500 ease-out hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 rounded-xl transform hover:scale-105 group dark:hover:from-slate-900 dark:hover:to-[#361618]",
              isHovered ? "justify-start" : "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-red-600" />
            {isHovered && (
              <span className="font-medium ml-3 animate-in slide-in-from-left-3 duration-500 ease-out transition-colors duration-300 group-hover:text-red-700">
                Logout
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
