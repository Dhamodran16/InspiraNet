import React, { useEffect, useRef } from 'react';

class JitsiErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // Optionally log error
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Failed to load Jitsi meeting. Please try again later.</div>;
    }
    return this.props.children;
  }
}

interface JitsiMeetRoomProps {
  roomName: string;
  userName: string;
}

function JitsiMeetRoomInner({ roomName, userName }: JitsiMeetRoomProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    if (window.JitsiMeetExternalAPI) {
      // @ts-ignore
      const domain = 'meet.jit.si';
      const options = {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: { displayName: userName },
        width: '100%',
        height: 600,
      };
      // @ts-ignore
      const api = new window.JitsiMeetExternalAPI(domain, options);
      return () => api.dispose();
    }
  }, [roomName, userName]);

  return <div ref={jitsiContainerRef} style={{ width: '100%', height: 600 }} />;
}

export default function JitsiMeetRoom(props: JitsiMeetRoomProps) {
  return (
    <JitsiErrorBoundary>
      <JitsiMeetRoomInner {...props} />
    </JitsiErrorBoundary>
  );
}