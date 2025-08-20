const crypto = require('crypto');

// Helper function to encrypt message content
const encryptMessage = (content, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Helper function to decrypt message content
const decryptMessage = (encryptedData, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Helper function to generate conversation encryption key
const generateConversationKey = (conversationId, participantIds) => {
  const sortedIds = participantIds.sort().join('-');
  return crypto.createHash('sha256').update(`${conversationId}-${sortedIds}`).digest('hex');
};

// Helper function to check if users can message each other
const canUsersMessage = async (user1Id, user2Id, User) => {
  try {
    const user1 = await User.findById(user1Id).select('following followers messagePolicy');
    const user2 = await User.findById(user2Id).select('following followers messagePolicy');
    
    if (!user1 || !user2) return false;
    
    const user1FollowingUser2 = user1.following.includes(user2Id);
    const user2FollowingUser1 = user2.following.includes(user1Id);
    const isMutual = user1FollowingUser2 && user2FollowingUser1;
    
    // Mutual followers can always message each other
    if (isMutual) return true;
    
    // Check individual message policies
    if (user2.messagePolicy === 'everyone') return true;
    if (user2.messagePolicy === 'followers' && user1FollowingUser2) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking messaging permissions:', error);
    return false;
  }
};

module.exports = {
  encryptMessage,
  decryptMessage,
  generateConversationKey,
  canUsersMessage
};











