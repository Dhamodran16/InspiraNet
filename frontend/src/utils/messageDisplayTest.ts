/**
 * Message Display Test Utilities
 * 
 * This file contains utilities to test and verify message display logic
 * for both direct messages and group chats.
 */

export interface TestMessage {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  createdAt: string;
  timeAgo: string;
  isOwn?: boolean;
}

export interface TestConversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    avatar?: string;
    type: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: string;
  isGroupChat: boolean;
  unreadCount: number;
}

/**
 * Test message display logic for sender/receiver alignment
 */
export function testMessageDisplay(
  message: TestMessage,
  currentUserId: string,
  conversation: TestConversation
): {
  isOwn: boolean;
  shouldShowSenderName: boolean;
  alignment: 'left' | 'right';
  avatarVisible: boolean;
} {
  // Determine if message is from current user
  const isOwn = message.senderId === currentUserId;
  
  // Show sender name for group chats or received messages
  const shouldShowSenderName = !isOwn && (conversation.isGroupChat || true);
  
  // Message alignment
  const alignment = isOwn ? 'right' : 'left';
  
  // Avatar visibility (only for received messages)
  const avatarVisible = !isOwn;
  
  return {
    isOwn,
    shouldShowSenderName,
    alignment,
    avatarVisible
  };
}

/**
 * Test group chat message display
 */
export function testGroupChatMessage(
  message: TestMessage,
  currentUserId: string,
  conversation: TestConversation
): {
  senderName: string;
  isOwn: boolean;
  shouldShowAvatar: boolean;
  shouldShowSenderName: boolean;
} {
  const isOwn = message.senderId === currentUserId;
  
  // Get sender name from participants or message
  const senderName = isOwn ? 'You' : 
    conversation.participants.find(p => p._id === message.senderId)?.name || 
    message.senderName || 'Unknown User';
  
  return {
    senderName,
    isOwn,
    shouldShowAvatar: !isOwn,
    shouldShowSenderName: !isOwn && conversation.isGroupChat
  };
}

/**
 * Test direct message display
 */
export function testDirectMessage(
  message: TestMessage,
  currentUserId: string
): {
  isOwn: boolean;
  shouldShowAvatar: boolean;
  shouldShowSenderName: boolean;
} {
  const isOwn = message.senderId === currentUserId;
  
  return {
    isOwn,
    shouldShowAvatar: !isOwn,
    shouldShowSenderName: false // Don't show sender name in direct messages
  };
}

/**
 * Validate message routing and display consistency
 */
export function validateMessageRouting(
  messages: TestMessage[],
  currentUserId: string,
  conversation: TestConversation
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  messages.forEach((message, index) => {
    const test = testMessageDisplay(message, currentUserId, conversation);
    
    // Check if isOwn is correctly determined
    if (message.senderId === currentUserId && !test.isOwn) {
      errors.push(`Message ${index}: isOwn should be true for current user's message`);
    }
    
    if (message.senderId !== currentUserId && test.isOwn) {
      errors.push(`Message ${index}: isOwn should be false for other user's message`);
    }
    
    // Check sender name display logic
    if (conversation.isGroupChat && !test.isOwn && !test.shouldShowSenderName) {
      warnings.push(`Message ${index}: Should show sender name in group chat for received messages`);
    }
    
    // Check avatar visibility
    if (!test.isOwn && !test.avatarVisible) {
      warnings.push(`Message ${index}: Should show avatar for received messages`);
    }
    
    if (test.isOwn && test.avatarVisible) {
      warnings.push(`Message ${index}: Should not show avatar for own messages`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create test data for message display testing
 */
export function createTestData() {
  const currentUserId = 'user1';
  const otherUserId = 'user2';
  const groupUserId = 'user3';
  
  const directConversation: TestConversation = {
    _id: 'conv1',
    participants: [
      { _id: currentUserId, name: 'Current User', type: 'student' },
      { _id: otherUserId, name: 'Other User', type: 'alumni' }
    ],
    isGroupChat: false,
    unreadCount: 0
  };
  
  const groupConversation: TestConversation = {
    _id: 'conv2',
    participants: [
      { _id: currentUserId, name: 'Current User', type: 'student' },
      { _id: otherUserId, name: 'Other User', type: 'alumni' },
      { _id: groupUserId, name: 'Group User', type: 'faculty' }
    ],
    isGroupChat: true,
    unreadCount: 0
  };
  
  const testMessages: TestMessage[] = [
    {
      _id: 'msg1',
      senderId: currentUserId,
      senderName: 'Current User',
      content: 'Hello from current user',
      messageType: 'text',
      isRead: true,
      readBy: [],
      createdAt: new Date().toISOString(),
      timeAgo: 'now'
    },
    {
      _id: 'msg2',
      senderId: otherUserId,
      senderName: 'Other User',
      content: 'Hello from other user',
      messageType: 'text',
      isRead: true,
      readBy: [],
      createdAt: new Date().toISOString(),
      timeAgo: 'now'
    },
    {
      _id: 'msg3',
      senderId: groupUserId,
      senderName: 'Group User',
      content: 'Hello from group user',
      messageType: 'text',
      isRead: true,
      readBy: [],
      createdAt: new Date().toISOString(),
      timeAgo: 'now'
    }
  ];
  
  return {
    currentUserId,
    directConversation,
    groupConversation,
    testMessages
  };
}

/**
 * Run comprehensive message display tests
 */
export function runMessageDisplayTests() {
  const { currentUserId, directConversation, groupConversation, testMessages } = createTestData();
  
  console.log('🧪 Running Message Display Tests...');
  
  // Test direct message display
  console.log('\n📱 Testing Direct Message Display:');
  const directValidation = validateMessageRouting(testMessages, currentUserId, directConversation);
  console.log('Direct Message Validation:', directValidation);
  
  // Test group chat display
  console.log('\n👥 Testing Group Chat Display:');
  const groupValidation = validateMessageRouting(testMessages, currentUserId, groupConversation);
  console.log('Group Chat Validation:', groupValidation);
  
  // Test individual message display logic
  console.log('\n🔍 Testing Individual Message Logic:');
  testMessages.forEach((message, index) => {
    const directTest = testMessageDisplay(message, currentUserId, directConversation);
    const groupTest = testMessageDisplay(message, currentUserId, groupConversation);
    
    console.log(`Message ${index + 1}:`, {
      direct: directTest,
      group: groupTest
    });
  });
  
  return {
    directValidation,
    groupValidation,
    allTestsPassed: directValidation.isValid && groupValidation.isValid
  };
}
