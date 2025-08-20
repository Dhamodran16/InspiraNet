// Message encryption utility using byte script for privacy
export class MessageEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;

  // Generate a random key
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a key from password
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
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

  // Encrypt message
  static async encryptMessage(message: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      key,
      messageBuffer
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt message
  static async decryptMessage(encryptedMessage: string, key: CryptoKey): Promise<string> {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedMessage).split('').map(char => char.charCodeAt(0))
      );

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encryptedData = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate conversation key from participants
  static generateConversationKey(participantIds: string[]): string {
    // Sort participant IDs to ensure consistent key generation
    const sortedIds = participantIds.sort();
    const combined = sortedIds.join('|');
    
    // Create a hash of the combined IDs
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  // Encrypt message for conversation
  static async encryptConversationMessage(message: string, participantIds: string[]): Promise<string> {
    const conversationKey = MessageEncryption.generateConversationKey(participantIds);
    const key = await MessageEncryption.deriveKey(
      conversationKey,
      new Uint8Array(MessageEncryption.SALT_LENGTH)
    );
    return await MessageEncryption.encryptMessage(message, key);
  }

  // Decrypt message for conversation
  static async decryptConversationMessage(encryptedMessage: string, participantIds: string[]): Promise<string> {
    const conversationKey = MessageEncryption.generateConversationKey(participantIds);
    const key = await MessageEncryption.deriveKey(
      conversationKey,
      new Uint8Array(MessageEncryption.SALT_LENGTH)
    );
    return await MessageEncryption.decryptMessage(encryptedMessage, key);
  }
}

// Export utility functions
export const encryptMessage = MessageEncryption.encryptConversationMessage;
export const decryptMessage = MessageEncryption.decryptConversationMessage;
export const generateConversationKey = MessageEncryption.generateConversationKey;

