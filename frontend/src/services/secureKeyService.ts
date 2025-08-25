import { AdvancedMessageEncryption, UserKeyPair, SharedSecret } from '@/utils/messageEncryption';

export class SecureKeyService {
  private static instance: SecureKeyService;
  private userKeys: Map<string, UserKeyPair> = new Map();
  private sharedSecrets: Map<string, SharedSecret> = new Map();
  private masterKey: string | null = null;

  private constructor() {
    this.initializeFromStorage();
  }

  static getInstance(): SecureKeyService {
    if (!SecureKeyService.instance) {
      SecureKeyService.instance = new SecureKeyService();
    }
    return SecureKeyService.instance;
  }

  // Initialize keys from secure storage
  private initializeFromStorage(): void {
    try {
      // Load user keys from localStorage (in production, use more secure storage)
      const storedKeys = localStorage.getItem('inspiranet_user_keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        this.userKeys = new Map(Object.entries(keys));
      }

      // Load shared secrets
      const storedSecrets = localStorage.getItem('inspiranet_shared_secrets');
      if (storedSecrets) {
        const secrets = JSON.parse(storedSecrets);
        this.sharedSecrets = new Map(Object.entries(secrets));
      }

      // Load master key
      this.masterKey = localStorage.getItem('inspiranet_master_key');
    } catch (error) {
      console.warn('Failed to load keys from storage:', error);
      this.generateNewMasterKey();
    }
  }

  // Generate a new master key
  private generateNewMasterKey(): void {
    this.masterKey = AdvancedMessageEncryption.generateSecureRandomString(64);
    localStorage.setItem('inspiranet_master_key', this.masterKey);
  }

  // Get or create user key pair
  async getUserKeyPair(userId: string): Promise<UserKeyPair> {
    if (this.userKeys.has(userId)) {
      return this.userKeys.get(userId)!;
    }

    // Generate new key pair
    const keyPair = await AdvancedMessageEncryption.generateUserKeyPair(userId);
    this.userKeys.set(userId, keyPair);
    this.saveUserKeys();
    
    return keyPair;
  }

  // Get or create shared secret for a conversation
  async getSharedSecret(participants: string[], conversationId: string): Promise<string> {
    if (this.sharedSecrets.has(conversationId)) {
      const secret = this.sharedSecrets.get(conversationId)!;
      
      // Check if participants match
      if (this.arraysEqual(secret.participants.sort(), participants.sort())) {
        // Update last used timestamp
        secret.lastUsed = Date.now();
        this.saveSharedSecrets();
        return secret.secret;
      }
    }

    // Generate new shared secret
    const secret = await this.generateSharedSecret(participants, conversationId);
    this.sharedSecrets.set(conversationId, secret);
    this.saveSharedSecrets();
    
    return secret.secret;
  }

  // Generate a new shared secret for participants
  private async generateSharedSecret(participants: string[], conversationId: string): Promise<SharedSecret> {
    // Use master key and participant IDs to generate a unique secret
    const masterKey = this.masterKey || this.generateNewMasterKey();
    const secret = await AdvancedMessageEncryption.deriveConversationSecret(
      participants,
      conversationId,
      masterKey!
    );

    return {
      conversationId,
      secret,
      participants: [...participants],
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
  }

  // Get shared secret for a post (for comments)
  async getPostSharedSecret(postId: string, postAuthorId: string, currentUserId: string): Promise<string> {
    const conversationId = `post_${postId}`;
    const participants = [postAuthorId, currentUserId];
    
    return await this.getSharedSecret(participants, conversationId);
  }

  // Save user keys to storage
  private saveUserKeys(): void {
    try {
      const keysObject = Object.fromEntries(this.userKeys);
      localStorage.setItem('inspiranet_user_keys', JSON.stringify(keysObject));
    } catch (error) {
      console.error('Failed to save user keys:', error);
    }
  }

  // Save shared secrets to storage
  private saveSharedSecrets(): void {
    try {
      const secretsObject = Object.fromEntries(this.sharedSecrets);
      localStorage.setItem('inspiranet_shared_secrets', JSON.stringify(secretsObject));
    } catch (error) {
      console.error('Failed to save shared secrets:', error);
    }
  }

  // Clear all keys (for logout)
  clearAllKeys(): void {
    this.userKeys.clear();
    this.sharedSecrets.clear();
    this.masterKey = null;
    
    localStorage.removeItem('inspiranet_user_keys');
    localStorage.removeItem('inspiranet_shared_secrets');
    localStorage.removeItem('inspiranet_master_key');
  }

  // Check if arrays are equal
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Get conversation ID for two users
  getConversationId(user1Id: string, user2Id: string): string {
    return AdvancedMessageEncryption.generateConversationId(user1Id, user2Id);
  }

  // Validate key integrity
  validateKeyIntegrity(): boolean {
    try {
      // Check if master key exists
      if (!this.masterKey) return false;

      // Check if user keys are valid
      for (const [userId, keyPair] of this.userKeys) {
        if (!keyPair.publicKey || !keyPair.privateKey || !keyPair.userId) {
          return false;
        }
      }

      // Check if shared secrets are valid
      for (const [conversationId, secret] of this.sharedSecrets) {
        if (!secret.secret || !secret.participants || secret.participants.length === 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Rotate keys (for security)
  async rotateKeys(): Promise<void> {
    try {
      // Generate new master key
      this.generateNewMasterKey();
      
      // Clear existing shared secrets (they'll be regenerated when needed)
      this.sharedSecrets.clear();
      this.saveSharedSecrets();
      
      console.log('Keys rotated successfully');
    } catch (error) {
      console.error('Failed to rotate keys:', error);
      throw error;
    }
  }
}

export default SecureKeyService;
