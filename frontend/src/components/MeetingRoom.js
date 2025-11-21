import React, { useState, useEffect } from 'react';
import { useMeeting } from '../hooks/useMeeting';
import './MeetingRoom.css';

const MeetingRoom = ({ meetingId, userData, onLeave }) => {
    const [chatMessage, setChatMessage] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);

    const {
        localStream,
        remoteStreams,
        participants,
        messages,
        isConnected,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        error,
        localVideoRef,
        initializeMeeting,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        sendMessage,
        raiseHand,
        leaveMeeting
    } = useMeeting();

    // Initialize meeting on mount
    useEffect(() => {
        if (meetingId && userData) {
            initializeMeeting(meetingId, userData);
        }
    }, [meetingId, userData, initializeMeeting]);

    // Handle chat message submission
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (chatMessage.trim()) {
            sendMessage(chatMessage.trim());
            setChatMessage('');
        }
    };

    // Handle leave meeting
    const handleLeaveMeeting = () => {
        leaveMeeting();
        if (onLeave) onLeave();
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (error) {
        return (
            <div className="meeting-error">
                <div className="error-content">
                    <h2>Meeting Error</h2>
                    <p>{error}</p>
                    <button onClick={handleLeaveMeeting}>Leave Meeting</button>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="meeting-loading">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <h2>Joining Meeting...</h2>
                    <p>Please wait while we connect you to the meeting</p>
                </div>
            </div>
        );
    }

    return (
        <div className="meeting-room">
            {/* Header */}
            <div className="meeting-header">
                <div className="meeting-info">
                    <h1>Meeting: {meetingId}</h1>
                    <div className="participant-count">
                        <span className="online-indicator"></span>
                        {participants.length} participants
                    </div>
                </div>
                <div className="meeting-controls">
                    <button
                        className="control-btn"
                        onClick={() => setShowParticipants(!showParticipants)}
                        title="Participants"
                    >
                        👥 {participants.length}
                    </button>
                    <button
                        className="control-btn"
                        onClick={() => setShowChat(!showChat)}
                        title="Chat"
                    >
                        💬
                    </button>
                    <button
                        className="control-btn leave-btn"
                        onClick={handleLeaveMeeting}
                        title="Leave Meeting"
                    >
                        📞 Leave
                    </button>
                </div>
            </div>

            <div className="meeting-main">
                {/* Video Area */}
                <div className="video-area">
                    {/* Local Video */}
                    <div className="video-container local-video">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="video-element"
                        />
                        <div className="video-controls">
                            <button
                                className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
                                onClick={toggleAudio}
                                title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
                            >
                                {isAudioEnabled ? '🎤' : '🚫'}
                            </button>
                            <button
                                className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
                                onClick={toggleVideo}
                                title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                            >
                                {isVideoEnabled ? '📹' : '🚫'}
                            </button>
                            <button
                                className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                            >
                                {isScreenSharing ? '🖥️' : '💻'}
                            </button>
                        </div>
                        <div className="participant-name">
                            You {isScreenSharing && '(Screen)'}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                        const participant = participants.find(p => p.userId === userId);
                        return (
                            <div key={userId} className="video-container remote-video">
                                <video
                                    autoPlay
                                    playsInline
                                    className="video-element"
                                    ref={(video) => {
                                        if (video && stream) {
                                            video.srcObject = stream;
                                        }
                                    }}
                                />
                                <div className="participant-info">
                                    <div className="participant-name">
                                        {participant?.username || 'Unknown'}
                                    </div>
                                    <div className="participant-status">
                                        {!participant?.isAudioEnabled && '🔇 '}
                                        {!participant?.isVideoEnabled && '🚫 '}
                                        {participant?.hasRaisedHand && '✋ '}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Placeholder for empty slots */}
                    {Array.from({ length: 8 - remoteStreams.size }, (_, i) => (
                        <div key={`placeholder-${i}`} className="video-container placeholder">
                            <div className="placeholder-content">
                                <div className="placeholder-icon">👤</div>
                                <div className="placeholder-text">Waiting for participant...</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Side Panel */}
                {(showChat || showParticipants) && (
                    <div className="side-panel">
                        {showParticipants && (
                            <div className="participants-panel">
                                <div className="panel-header">
                                    <h3>Participants ({participants.length})</h3>
                                    <button
                                        className="close-btn"
                                        onClick={() => setShowParticipants(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="participants-list">
                                    {participants.map((participant) => (
                                        <div key={participant.userId} className="participant-item">
                                            <div className="participant-avatar">
                                                {participant.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="participant-details">
                                                <div className="participant-name">
                                                    {participant.username}
                                                    {participant.isHost && ' (Host)'}
                                                </div>
                                                <div className="participant-status">
                                                    {!participant.isAudioEnabled && '🔇 '}
                                                    {!participant.isVideoEnabled && '🚫 '}
                                                    {participant.hasRaisedHand && '✋ '}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showChat && (
                            <div className="chat-panel">
                                <div className="panel-header">
                                    <h3>Chat</h3>
                                    <button
                                        className="close-btn"
                                        onClick={() => setShowChat(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="chat-messages">
                                    {messages.map((message, index) => (
                                        <div key={index} className="chat-message">
                                            <div className="message-header">
                                                <span className="message-sender">
                                                    {message.username}
                                                </span>
                                                <span className="message-time">
                                                    {formatTime(message.timestamp)}
                                                </span>
                                            </div>
                                            <div className="message-content">
                                                {message.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <form className="chat-input" onSubmit={handleSendMessage}>
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        maxLength={500}
                                    />
                                    <button type="submit" disabled={!chatMessage.trim()}>
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="meeting-footer">
                <div className="control-buttons">
                    <button
                        className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
                        onClick={toggleAudio}
                        title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
                    >
                        {isAudioEnabled ? '🎤' : '🚫'}
                    </button>
                    <button
                        className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
                        onClick={toggleVideo}
                        title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                    >
                        {isVideoEnabled ? '📹' : '🚫'}
                    </button>
                    <button
                        className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                        title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                    >
                        {isScreenSharing ? '🖥️' : '💻'}
                    </button>
                    <button
                        className="control-btn"
                        onClick={() => raiseHand()}
                        title="Raise Hand"
                    >
                        ✋
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingRoom;
