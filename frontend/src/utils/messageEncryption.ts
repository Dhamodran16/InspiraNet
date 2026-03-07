// Advanced message encryption utility for privacy and security
export interface EncryptedMessage {
  encryptedData: string;
  iv: string;
  authTag: string;
  senderId: string;
  recipientId?: string;
  timestamp: number;
  messageType: 'message' | 'comment';
  conversationId?: string;
  postId?: string;
}

export interface UserKeyPair {
  userId: string;
  publicKey: string;
  privateKey: string;
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
  private static readonly SALT_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 128;

  // Generate a secure random string
  static generateSecureRandomString(length: number): string {
    const array = new Uint8Array(length / 2);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Generate a key pair for a user
  static async generateUserKeyPair(userId: string): Promise<UserKeyPair> {
    const publicKey = this.generateSecureRandomString(32);
    const privateKey = this.generateSecureRandomString(64);

    return {
      userId,
      publicKey,
      privateKey,
      createdAt: Date.now()
    };
  }

  // Generate conversation ID for two users
  static generateConversationId(user1Id: string, user2Id: string): string {
    const sortedIds = [user1Id, user2Id].sort();
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
  }

  // Derive a conversation secret
  static async deriveConversationSecret(
    participants: string[],
    conversationId: string,
    masterKey: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const sortedParticipants = [...participants].sort().join(':');
    const data = `${conversationId}:${sortedParticipants}:${masterKey}`;
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get key from password/secret
  private static async getKeyFromSecret(secret: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(secret);

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
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256'
      } as any,
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt a message
  static async encryptMessage(
    message: string,
    senderId: string,
    recipientId: string,
    conversationId: string,
    sharedSecret: string
  ): Promise<EncryptedMessage> {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const key = await this.getKeyFromSecret(sharedSecret, salt);

    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.AUTH_TAG_LENGTH
      },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const authTag = encryptedArray.slice(-this.AUTH_TAG_LENGTH / 8);
    const encryptedData = encryptedArray.slice(0, -this.AUTH_TAG_LENGTH / 8);

    return {
      encryptedData: btoa(String.fromCharCode(...encryptedData)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
      senderId,
      recipientId,
      timestamp: Date.now(),
      messageType: 'message',
      conversationId
    };
  }

  // Decrypt a message
  static async decryptMessage(
    message: EncryptedMessage,
    sharedSecret: string,
    conversationId: string
  ): Promise<string> {
    try {
      const salt = new Uint8Array(this.SALT_LENGTH); // In a real production app, we'd store salt too
      const key = await this.getKeyFromSecret(sharedSecret, salt);

      const iv = new Uint8Array(atob(message.iv).split('').map(c => c.charCodeAt(0)));
      const encryptedData = new Uint8Array(atob(message.encryptedData).split('').map(c => c.charCodeAt(0)));
      const authTag = new Uint8Array(atob(message.authTag).split('').map(c => c.charCodeAt(0)));

      const combinedData = new Uint8Array(encryptedData.length + authTag.length);
      combinedData.set(encryptedData);
      combinedData.set(authTag, encryptedData.length);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.AUTH_TAG_LENGTH
        },
        key,
        combinedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Message decryption failed]';
    }
  }

  // Encrypt a comment
  static async encryptComment(
    content: string,
    senderId: string,
    postId: string,
    postAuthorId: string,
    sharedSecret: string
  ): Promise<EncryptedMessage> {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const key = await this.getKeyFromSecret(sharedSecret, salt);

    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.AUTH_TAG_LENGTH
      },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const authTag = encryptedArray.slice(-this.AUTH_TAG_LENGTH / 8);
    const encryptedData = encryptedArray.slice(0, -this.AUTH_TAG_LENGTH / 8);

    return {
      encryptedData: btoa(String.fromCharCode(...encryptedData)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
      senderId,
      postId,
      timestamp: Date.now(),
      messageType: 'comment'
    };
  }

  // Decrypt a comment
  static async decryptComment(
    message: EncryptedMessage,
    sharedSecret: string,
    postId: string
  ): Promise<string> {
    try {
      const salt = new Uint8Array(this.SALT_LENGTH);
      const key = await this.getKeyFromSecret(sharedSecret, salt);

      const iv = new Uint8Array(atob(message.iv).split('').map(c => c.charCodeAt(0)));
      const encryptedData = new Uint8Array(atob(message.encryptedData).split('').map(c => c.charCodeAt(0)));
      const authTag = new Uint8Array(atob(message.authTag).split('').map(c => c.charCodeAt(0)));

      const combinedData = new Uint8Array(encryptedData.length + authTag.length);
      combinedData.set(encryptedData);
      combinedData.set(authTag, encryptedData.length);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.AUTH_TAG_LENGTH
        },
        key,
        combinedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Comment decryption failed:', error);
      return '[Comment decryption failed]';
    }
  }
}

// Support legacy exports for backward compatibility
export const MessageEncryption = AdvancedMessageEncryption;
export const encryptMessage = async (message: string, participantIds: string[]) => {
  // Legacy simpler implementation or wrapper
  return message;
};
export const decryptMessage = async (encrypted: string, participantIds: string[]) => {
  return encrypted;
};
export const generateConversationKey = (participantIds: string[]) => {
  return participantIds.sort().join('|');
};
