// Extend Window interface for testing
declare global {
  interface Window {
    testEncryption: () => Promise<boolean>;
    testCommentEncryption: () => Promise<boolean>;
  }
}

// Simple test for the encryption system
import { AdvancedMessageEncryption } from './messageEncryption';

export async function testEncryption() {
  try {
    console.log('🧪 Testing encryption system...');
    
    // Test basic encryption/decryption
    const testMessage = 'Hello, this is a secret message!';
    const senderId = 'user123';
    const recipientId = 'user456';
    const conversationId = 'conv_abc123';
    const sharedSecret = 'test_secret_key_123';
    
    console.log('📝 Original message:', testMessage);
    
    // Encrypt the message
    const encrypted = await AdvancedMessageEncryption.encryptMessage(
      testMessage,
      senderId,
      recipientId,
      conversationId,
      sharedSecret
    );
    
    console.log('🔒 Encrypted message:', encrypted);
    
    // Decrypt the message
    const decrypted = await AdvancedMessageEncryption.decryptMessage(
      encrypted,
      sharedSecret,
      conversationId
    );
    
    console.log('🔓 Decrypted message:', decrypted);
    
    // Verify the result
    if (decrypted === testMessage) {
      console.log('✅ Encryption test PASSED!');
      return true;
    } else {
      console.log('❌ Encryption test FAILED!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Encryption test error:', error);
    return false;
  }
}

export async function testCommentEncryption() {
  try {
    console.log('🧪 Testing comment encryption...');
    
    const testComment = 'This is a private comment!';
    const senderId = 'user123';
    const postId = 'post_789';
    const postAuthorId = 'user456';
    const sharedSecret = 'test_secret_key_123';
    
    console.log('📝 Original comment:', testComment);
    
    // Encrypt the comment
    const encrypted = await AdvancedMessageEncryption.encryptComment(
      testComment,
      senderId,
      postId,
      postAuthorId,
      sharedSecret
    );
    
    console.log('🔒 Encrypted comment:', encrypted);
    
    // Decrypt the comment
    const decrypted = await AdvancedMessageEncryption.decryptComment(
      encrypted,
      sharedSecret,
      postId
    );
    
    console.log('🔓 Decrypted comment:', decrypted);
    
    // Verify the result
    if (decrypted === testComment) {
      console.log('✅ Comment encryption test PASSED!');
      return true;
    } else {
      console.log('❌ Comment encryption test FAILED!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Comment encryption test error:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testEncryption = testEncryption;
  window.testCommentEncryption = testCommentEncryption;
  
  console.log('🧪 Encryption tests loaded. Run testEncryption() or testCommentEncryption() in console to test.');
}
