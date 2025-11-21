import React from 'react';

interface MessageDebuggerProps {
  message: any;
  currentUser: any;
  componentName: string;
}

export const MessageDebugger: React.FC<MessageDebuggerProps> = ({ 
  message, 
  currentUser, 
  componentName 
}) => {
  const currentUserId = currentUser?._id?.toString();
  const messageSenderId = message.senderId?.toString();
  const backendIsOwn = message.isOwn;
  const calculatedIsOwn = currentUserId === messageSenderId;
  const finalIsOwn = message.isOwn !== undefined ? message.isOwn : (currentUserId === messageSenderId);

  return (
    <div className="bg-yellow-100 border border-yellow-400 p-2 m-1 text-xs">
      <div className="font-bold text-red-600">🐛 DEBUG: {componentName}</div>
      <div><strong>Message ID:</strong> {message._id}</div>
      <div><strong>Current User ID:</strong> {currentUserId}</div>
      <div><strong>Message Sender ID:</strong> {messageSenderId}</div>
      <div><strong>Backend isOwn:</strong> {String(backendIsOwn)}</div>
      <div><strong>Calculated isOwn:</strong> {String(calculatedIsOwn)}</div>
      <div><strong>Final isOwn:</strong> {String(finalIsOwn)}</div>
      <div><strong>Sender Name:</strong> {message.senderName}</div>
      <div><strong>Content:</strong> {message.content?.substring(0, 30)}...</div>
      <div><strong>Alignment:</strong> {finalIsOwn ? 'RIGHT (Own)' : 'LEFT (Received)'}</div>
    </div>
  );
};
