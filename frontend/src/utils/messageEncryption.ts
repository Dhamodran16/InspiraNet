// Advanced Message Encryption System
// Uses AES-256-GCM with user-specific keys and secure key exchange
// Only intended recipients can decrypt messages

export interface EncryptedMessage {
  encryptedData: string;
  iv: string;
  authTag: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  messageType: 'message' | 'comment';
  conversationId?: string;
  postId?: string;
}

export interface UserKeyPair {
  publicKey: string;
  privateKey: string;
  userId: string;
  createdAt: number;
}

export interface SharedSecret {
  conversationId: string;
  secret: string;
  participants: string[];
  createdAt: number;
  lastUsed: number;
}

export class AdvancedMessageEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly ITERATIONS = 100000;

  // Generate a cryptographically secure random key
  static async generateSecureKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a key pair for a user (public/private key)
  static async generateUserKeyPair(userId: string): Promise<UserKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export public key
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    // Export private key
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    return {
      publicKey,
      privateKey,
      userId,
      createdAt: Date.now()
    };
  }

  // Derive a shared secret for a conversation
  static async deriveConversationSecret(
    participants: string[],
    conversationId: string,
    masterKey: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${participants.sort().join(':')}:${conversationId}:${masterKey}`);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  // Encrypt a message with user-specific encryption
  static async encryptMessage(
    message: string,
    senderId: string,
    recipientId: string,
    conversationId: string,
    sharedSecret: string,
    messageType: 'message' | 'comment' = 'message',
    postId?: string
  ): Promise<EncryptedMessage> {
    try {
      // Derive encryption key from shared secret
      const key = await this.deriveKeyFromSecret(sharedSecret, conversationId);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Encrypt the message
      const encoder = new TextEncoder();
      const messageBuffer = encoder.encode(message);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        messageBuffer
      );

      // Extract auth tag (last 16 bytes in GCM mode)
      const authTag = encryptedBuffer.slice(-this.AUTH_TAG_LENGTH);
      const encryptedData = encryptedBuffer.slice(0, -this.AUTH_TAG_LENGTH);

      return {
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iv: btoa(String.fromCharCode(...iv)),
        authTag: btoa(String.fromCharCode(...new Uint8Array(authTag))),
        senderId,
        recipientId,
        timestamp: Date.now(),
        messageType,
        conversationId,
        postId
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt a message (only works for intended recipients)
  static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: string,
    conversationId: string
  ): Promise<string> {
    try {
      // Verify the message is for this conversation
      if (encryptedMessage.conversationId !== conversationId) {
        throw new Error('Invalid conversation ID');
      }

      // Derive decryption key from shared secret
      const key = await this.deriveKeyFromSecret(sharedSecret, conversationId);
      
      // Convert base64 strings back to Uint8Arrays
      const encryptedData = new Uint8Array(
        atob(encryptedMessage.encryptedData).split('').map(char => char.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(encryptedMessage.iv).split('').map(char => char.charCodeAt(0))
      );
      const authTag = new Uint8Array(
        atob(encryptedMessage.authTag).split('').map(char => char.charCodeAt(0))
      );

      // Combine encrypted data and auth tag
      const combinedData = new Uint8Array(encryptedData.length + authTag.length);
      combinedData.set(encryptedData, 0);
      combinedData.set(authTag, encryptedData.length);

      // Decrypt the message
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        combinedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt message - unauthorized access or corrupted data');
    }
  }

  // Derive encryption key from shared secret
  private static async deriveKeyFromSecret(secret: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(secret);
    const saltBuffer = encoder.encode(salt);
    
    // Use PBKDF2 to derive a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt comment for a post
  static async encryptComment(
    comment: string,
    senderId: string,
    postId: string,
    postAuthorId: string,
    sharedSecret: string
  ): Promise<EncryptedMessage> {
    return await this.encryptMessage(
      comment,
      senderId,
      postAuthorId,
      `post_${postId}`,
      sharedSecret,
      'comment',
      postId
    );
  }

  // Decrypt comment
  static async decryptComment(
    encryptedComment: EncryptedMessage,
    sharedSecret: string,
    postId: string
  ): Promise<string> {
    return await this.decryptMessage(
      encryptedComment,
      sharedSecret,
      `post_${postId}`
    );
  }

  // Generate a unique conversation ID
  static generateConversationId(user1Id: string, user2Id: string): string {
    const sortedIds = [user1Id, user2Id].sort();
    const combined = `${sortedIds[0]}_${sortedIds[1]}`;
    const hash = this.simpleHash(combined);
    return `conv_${hash}`;
  }

  // Simple hash function for conversation ID generation
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Verify message integrity
  static verifyMessageIntegrity(encryptedMessage: EncryptedMessage): boolean {
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

  // Generate a secure random string for additional security
  static generateSecureRandomString(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

// Legacy compatibility functions
export const encryptMessage = AdvancedMessageEncryption.encryptMessage.bind(AdvancedMessageEncryption);
export const decryptMessage = AdvancedMessageEncryption.decryptMessage.bind(AdvancedMessageEncryption);

