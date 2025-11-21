const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.authTagLength = 16; // 128 bits
  }

  // Generate a secure random key
  generateSecureKey() {
    return crypto.randomBytes(this.keyLength);
  }

  // Generate a secure random IV
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  // Derive a key from a shared secret
  deriveKey(sharedSecret, salt) {
    return crypto.pbkdf2Sync(sharedSecret, salt, 100000, this.keyLength, 'sha256');
  }

  // Encrypt data
  encrypt(data, key, iv) {
    try {
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('inspiranet', 'utf8')); // Additional authenticated data
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  decrypt(encryptedData, key, iv, authTag) {
    try {
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('inspiranet', 'utf8')); // Additional authenticated data
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed - unauthorized access or corrupted data');
    }
  }

  // Encrypt a message for a conversation
  encryptMessage(message, senderId, recipientId, conversationId, sharedSecret) {
    try {
      const salt = Buffer.from(conversationId, 'utf8');
      const key = this.deriveKey(sharedSecret, salt);
      const iv = this.generateIV();
      
      const encrypted = this.encrypt(message, key, iv);
      
      return {
        ...encrypted,
        senderId,
        recipientId,
        conversationId,
        timestamp: Date.now(),
        messageType: 'message'
      };
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }

  // Encrypt a comment for a post
  encryptComment(comment, senderId, postId, postAuthorId, sharedSecret) {
    try {
      const conversationId = `post_${postId}`;
      const salt = Buffer.from(conversationId, 'utf8');
      const key = this.deriveKey(sharedSecret, salt);
      const iv = this.generateIV();
      
      const encrypted = this.encrypt(comment, key, iv);
      
      return {
        ...encrypted,
        senderId,
        recipientId: postAuthorId,
        conversationId,
        postId,
        timestamp: Date.now(),
        messageType: 'comment'
      };
    } catch (error) {
      console.error('Comment encryption failed:', error);
      throw error;
    }
  }

  // Decrypt a message
  decryptMessage(encryptedMessage, sharedSecret, conversationId) {
    try {
      const salt = Buffer.from(conversationId, 'utf8');
      const key = this.deriveKey(sharedSecret, salt);
      
      const iv = Buffer.from(encryptedMessage.iv, 'hex');
      const authTag = Buffer.from(encryptedMessage.authTag, 'hex');
      
      return this.decrypt(encryptedMessage.encryptedData, key, iv, authTag);
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw error;
    }
  }

  // Decrypt a comment
  decryptComment(encryptedComment, sharedSecret, postId) {
    try {
      const conversationId = `post_${postId}`;
      return this.decryptMessage(encryptedComment, sharedSecret, conversationId);
    } catch (error) {
      console.error('Comment decryption failed:', error);
      throw error;
    }
  }

  // Generate a shared secret for participants
  generateSharedSecret(participants, conversationId, masterKey) {
    try {
      const data = `${participants.sort().join(':')}:${conversationId}:${masterKey}`;
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('Shared secret generation failed:', error);
      throw error;
    }
  }

  // Verify message integrity
  verifyMessageIntegrity(encryptedMessage) {
    try {
      // Check if all required fields are present
      if (!encryptedMessage.encryptedData || 
          !encryptedMessage.iv || 
          !encryptedMessage.authTag || 
          !encryptedMessage.senderId || 
          !encryptedMessage.timestamp) {
        return false;
      }

      // Check if timestamp is not too old (24 hours)
      const now = Date.now();
      const messageAge = now - encryptedMessage.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (messageAge > maxAge) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate a secure random string
  generateSecureRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data (one-way)
  hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Compare hashed data securely
  compareHash(data, hash) {
    const dataHash = this.hashData(data);
    return crypto.timingSafeEqual(
      Buffer.from(dataHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }
}

module.exports = new EncryptionService();
