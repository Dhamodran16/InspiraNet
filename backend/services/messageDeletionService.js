const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

// Configuration
const DELETE_FOR_EVERYONE_TIME_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const GRACE_DELETE_MAX_RETRIES = 3;
const AUTO_DELETE_DURATIONS = {
  '24h': 24,
  '7d': 168, // 7 days = 168 hours
  '90d': 2160, // 90 days = 2160 hours
  'custom': null // Will be set by user
};

class MessageDeletionService {
  /**
   * 1. DeleteForMe - Remove message only from user's view
   */
  static async deleteForMe(messageIds, userId, conversationId) {
    try {
      // Ensure userId is ObjectId
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId
      });

      if (messages.length === 0) {
        return { success: false, error: 'No messages found' };
      }

      const results = await Promise.all(
        messages.map(async (message) => {
          // Check if already deleted for this user
          const alreadyDeleted = message.deletedBy.some(
            d => {
              const dUserId = d.userId ? d.userId.toString() : null;
              const currentUserId = userIdObj.toString();
              return dUserId === currentUserId && d.deleteMode === 'forMe';
            }
          );

          if (!alreadyDeleted) {
            // CRITICAL: Only add deletion entry for THIS user
            // Ensure we're storing ObjectId correctly
            const deletionEntry = {
              userId: userIdObj,
              deletedAt: new Date(),
              deleteMode: 'forMe'
            };
            
            message.deletedBy.push(deletionEntry);
            await message.save();
            
            // Verify the save worked correctly
            const savedMessage = await Message.findById(message._id);
            const hasThisUserDeletion = savedMessage.deletedBy.some(
              d => d.userId.toString() === userIdObj.toString() && d.deleteMode === 'forMe'
            );
            
            console.log('Marked message', message._id.toString(), 'as deleted for user:', userIdObj.toString(), 
              'deleteMode: forMe', 'Verified:', hasThisUserDeletion);
          } else {
            console.log('Message', message._id.toString(), 'already deleted for user:', userIdObj.toString());
          }
          return message._id;
        })
      );

      return {
        success: true,
        deletedCount: results.length,
        messageIds: results,
        deleteMode: 'forMe'
      };
    } catch (error) {
      console.error('Error in deleteForMe:', error);
      throw error;
    }
  }

  /**
   * 2. DeleteForEveryone - Remove from all devices (with time window check)
   */
  static async deleteForEveryone(messageIds, userId, conversationId, options = {}) {
    try {
      const { timeWindow = DELETE_FOR_EVERYONE_TIME_WINDOW, skipTimeWindow = false } = options;
      const now = new Date();

      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId
      }).populate('conversationId');

      if (messages.length === 0) {
        return { success: false, error: 'No messages found' };
      }

      // Check if user is sender of all messages
      const allOwnMessages = messages.every(
        msg => msg.senderId.toString() === userId.toString()
      );

      if (!allOwnMessages) {
        return { 
          success: false, 
          error: 'You can only delete your own messages for everyone' 
        };
      }

      // Check time window (skip if admin delete)
      const expiredMessages = skipTimeWindow ? [] : messages.filter(msg => {
        const messageAge = now - new Date(msg.createdAt);
        return messageAge > timeWindow;
      });

      if (expiredMessages.length > 0) {
        // Fall back to DeleteForMe for expired messages
        const forMeResults = await this.deleteForMe(
          expiredMessages.map(m => m._id),
          userId,
          conversationId
        );

        // Continue with DeleteForEveryone for non-expired messages
        const validMessages = messages.filter(msg => 
          !expiredMessages.some(exp => exp._id.toString() === msg._id.toString())
        );

        if (validMessages.length === 0) {
          return {
            success: true,
            deletedCount: forMeResults.deletedCount,
            messageIds: forMeResults.messageIds,
            deleteMode: 'forMe',
            warning: 'Time window expired, deleted for you only'
          };
        }

        const forEveryoneResults = await this._performDeleteForEveryone(
          validMessages.map(m => m._id),
          userId,
          conversationId
        );

        return {
          success: true,
          deletedCount: forMeResults.deletedCount + forEveryoneResults.deletedCount,
          messageIds: [...forMeResults.messageIds, ...forEveryoneResults.messageIds],
          deleteMode: 'mixed',
          forMeCount: forMeResults.deletedCount,
          forEveryoneCount: forEveryoneResults.deletedCount,
          warning: `${forMeResults.deletedCount} message(s) expired and deleted for you only`
        };
      }

      return await this._performDeleteForEveryone(messageIds, userId, conversationId);
    } catch (error) {
      console.error('Error in deleteForEveryone:', error);
      throw error;
    }
  }

  /**
   * Internal method to perform DeleteForEveryone
   */
  static async _performDeleteForEveryone(messageIds, userId, conversationId) {
    const messages = await Message.find({
      _id: { $in: messageIds },
      conversationId
    });

    const results = await Promise.all(
      messages.map(async (message) => {
        // Mark as deleted for everyone
        message.deletionMetadata.deletedForEveryone = true;
        message.deletionMetadata.deletedForEveryoneAt = new Date();
        message.deletionMetadata.deletedForEveryoneBy = userId;

        // Add to deletedBy array for all participants
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.participants) {
          conversation.participants.forEach(participantId => {
            const alreadyDeleted = message.deletedBy.some(
              d => d.userId.toString() === participantId.toString()
            );
            if (!alreadyDeleted) {
              message.deletedBy.push({
                userId: participantId,
                deletedAt: new Date(),
                deleteMode: 'forEveryone'
              });
            }
          });
        }

        await message.save();
        return message._id;
      })
    );

    return {
      success: true,
      deletedCount: results.length,
      messageIds: results,
      deleteMode: 'forEveryone'
    };
  }

  /**
   * 3. GraceDelete - Queue deletion for offline devices
   */
  static async graceDelete(messageIds, userId, conversationId, participantIds) {
    try {
      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId
      });

      if (messages.length === 0) {
        return { success: false, error: 'No messages found' };
      }

      // Mark messages for grace delete
      const results = await Promise.all(
        messages.map(async (message) => {
          message.deletionMetadata.graceDeleteQueued = true;
          message.deletionMetadata.graceDeleteRetries = 0;
          await message.save();
          return {
            messageId: message._id,
            participantIds,
            queuedAt: new Date()
          };
        })
      );

      return {
        success: true,
        queuedCount: results.length,
        queueItems: results,
        deleteMode: 'graceDelete'
      };
    } catch (error) {
      console.error('Error in graceDelete:', error);
      throw error;
    }
  }

  /**
   * Process grace delete queue when device comes online
   */
  static async processGraceDeleteQueue(userId) {
    try {
      const queuedMessages = await Message.find({
        'deletionMetadata.graceDeleteQueued': true,
        'deletionMetadata.graceDeleteRetries': { $lt: GRACE_DELETE_MAX_RETRIES },
        'deletedBy.userId': userId
      });

      const results = await Promise.all(
        queuedMessages.map(async (message) => {
          // Retry deletion
          message.deletionMetadata.graceDeleteRetries += 1;
          
          if (message.deletionMetadata.graceDeleteRetries >= GRACE_DELETE_MAX_RETRIES) {
            message.deletionMetadata.graceDeleteQueued = false;
          }

          await message.save();
          return message._id;
        })
      );

      return {
        success: true,
        processedCount: results.length,
        messageIds: results
      };
    } catch (error) {
      console.error('Error processing grace delete queue:', error);
      throw error;
    }
  }

  /**
   * 4. SoftDelete - Mark as deleted but keep in database
   */
  static async softDelete(messageIds, userId, conversationId) {
    try {
      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId
      });

      if (messages.length === 0) {
        return { success: false, error: 'No messages found' };
      }

      const results = await Promise.all(
        messages.map(async (message) => {
          message.isDeleted = true;
          
          const alreadyDeleted = message.deletedBy.some(
            d => d.userId.toString() === userId.toString() && d.deleteMode === 'soft'
          );

          if (!alreadyDeleted) {
            message.deletedBy.push({
              userId,
              deletedAt: new Date(),
              deleteMode: 'soft'
            });
          }

          await message.save();
          return message._id;
        })
      );

      return {
        success: true,
        deletedCount: results.length,
        messageIds: results,
        deleteMode: 'soft'
      };
    } catch (error) {
      console.error('Error in softDelete:', error);
      throw error;
    }
  }

  /**
   * 5. HardDelete - Permanently remove from database and storage
   */
  static async hardDelete(messageIds, userId, conversationId, options = {}) {
    try {
      const { deleteMedia = true } = options;

      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId
      });

      if (messages.length === 0) {
        return { success: false, error: 'No messages found' };
      }

      const deletedMedia = [];
      const results = await Promise.all(
        messages.map(async (message) => {
          // Delete media files if requested
          if (deleteMedia && message.mediaUrl) {
            try {
              // Extract public_id from Cloudinary URL
              const urlParts = message.mediaUrl.split('/');
              const publicId = urlParts.slice(-2).join('/').split('.')[0];
              
              if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                deletedMedia.push(message.mediaUrl);
              }
            } catch (mediaError) {
              console.error('Error deleting media:', mediaError);
            }
          }

          // Mark as hard deleted
          message.deletionMetadata.hardDeleted = true;
          message.deletionMetadata.hardDeletedAt = new Date();
          await message.save();

          // Actually delete from database
          await Message.deleteOne({ _id: message._id });

          return message._id;
        })
      );

      return {
        success: true,
        deletedCount: results.length,
        messageIds: results,
        deletedMediaCount: deletedMedia.length,
        deletedMedia,
        deleteMode: 'hard'
      };
    } catch (error) {
      console.error('Error in hardDelete:', error);
      throw error;
    }
  }

  /**
   * 6. AutoDelete - Set up disappearing messages
   */
  static async setAutoDelete(messageIds, userId, conversationId, duration) {
    try {
      const durationHours = AUTO_DELETE_DURATIONS[duration] || duration;
      
      if (!durationHours || durationHours <= 0) {
        return { success: false, error: 'Invalid duration' };
      }

      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId,
        senderId: userId // Only sender can set auto-delete
      });

      if (messages.length === 0) {
        return { success: false, error: 'No messages found or you are not the sender' };
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      const results = await Promise.all(
        messages.map(async (message) => {
          message.autoDelete.enabled = true;
          message.autoDelete.expiresAt = expiresAt;
          message.autoDelete.duration = durationHours;
          await message.save();
          return {
            messageId: message._id,
            expiresAt,
            duration: durationHours
          };
        })
      );

      return {
        success: true,
        setCount: results.length,
        messages: results,
        deleteMode: 'autoDelete'
      };
    } catch (error) {
      console.error('Error in setAutoDelete:', error);
      throw error;
    }
  }

  /**
   * Process expired auto-delete messages
   */
  static async processAutoDelete() {
    try {
      const now = new Date();
      const expiredMessages = await Message.find({
        'autoDelete.enabled': true,
        'autoDelete.expiresAt': { $lte: now },
        'deletionMetadata.hardDeleted': { $ne: true }
      });

      if (expiredMessages.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const messageIds = expiredMessages.map(m => m._id);
      const conversationIds = [...new Set(expiredMessages.map(m => m.conversationId.toString()))];

      // Hard delete expired messages
      const results = await Promise.all(
        expiredMessages.map(async (message) => {
          // Delete media
          if (message.mediaUrl) {
            try {
              const urlParts = message.mediaUrl.split('/');
              const publicId = urlParts.slice(-2).join('/').split('.')[0];
              if (publicId) {
                await cloudinary.uploader.destroy(publicId);
              }
            } catch (error) {
              console.error('Error deleting expired message media:', error);
            }
          }

          await Message.deleteOne({ _id: message._id });
          return message._id;
        })
      );

      // Update conversation lastMessage
      for (const conversationId of conversationIds) {
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 });
        
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageContent: lastMessage ? lastMessage.content : '',
          lastMessageTime: lastMessage ? lastMessage.createdAt : new Date()
        });
      }

      return {
        success: true,
        deletedCount: results.length,
        messageIds: results,
        deleteMode: 'autoDelete'
      };
    } catch (error) {
      console.error('Error processing auto-delete:', error);
      throw error;
    }
  }


  /**
   * 8. BulkDelete - Delete multiple messages
   */
  static async bulkDelete(messageIds, userId, conversationId, deleteMode, options = {}) {
    try {
      const { deleteMedia = false, filter = 'all' } = options;

      let query = {
        _id: { $in: messageIds },
        conversationId
      };

      // Apply filters
      if (filter === 'media') {
        query.messageType = { $in: ['image', 'video', 'file', 'pdf'] };
      }

      const messages = await Message.find(query);

      if (messages.length === 0) {
        return { success: false, error: 'No messages found matching criteria' };
      }

      let result;
      switch (deleteMode) {
        case 'forMe':
          result = await this.deleteForMe(
            messages.map(m => m._id),
            userId,
            conversationId
          );
          break;
        case 'forEveryone':
          result = await this.deleteForEveryone(
            messages.map(m => m._id),
            userId,
            conversationId
          );
          break;
        case 'hard':
          result = await this.hardDelete(
            messages.map(m => m._id),
            userId,
            conversationId,
            { deleteMedia }
          );
          break;
        case 'soft':
          result = await this.softDelete(
            messages.map(m => m._id),
            userId,
            conversationId
          );
          break;
        default:
          return { success: false, error: 'Invalid delete mode' };
      }

      return {
        ...result,
        filter,
        bulkDelete: true
      };
    } catch (error) {
      console.error('Error in bulkDelete:', error);
      throw error;
    }
  }

  /**
   * 9. MediaDelete - Delete media files
   */
  static async mediaDelete(messageIds, userId, conversationId, options = {}) {
    try {
      const { 
        deleteMessage = false, 
        deleteLocalOnly = false 
      } = options;

      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId,
        messageType: { $in: ['image', 'video', 'file', 'pdf'] }
      });

      if (messages.length === 0) {
        return { success: false, error: 'No media messages found' };
      }

      const deletedMedia = [];
      const results = await Promise.all(
        messages.map(async (message) => {
          if (message.mediaUrl) {
            try {
              if (!deleteLocalOnly) {
                // Delete from Cloudinary
                const urlParts = message.mediaUrl.split('/');
                const publicId = urlParts.slice(-2).join('/').split('.')[0];
                
                if (publicId) {
                  await cloudinary.uploader.destroy(publicId);
                  deletedMedia.push(message.mediaUrl);
                }
              }

              // Delete message if requested
              if (deleteMessage) {
                message.mediaUrl = null;
                message.fileName = null;
                message.fileSize = null;
                message.content = '[Media deleted]';
                await message.save();
              }
            } catch (error) {
              console.error('Error deleting media:', error);
            }
          }
          return message._id;
        })
      );

      return {
        success: true,
        deletedCount: results.length,
        deletedMediaCount: deletedMedia.length,
        deletedMedia,
        messageIds: results,
        deleteMode: 'media'
      };
    } catch (error) {
      console.error('Error in mediaDelete:', error);
      throw error;
    }
  }

  /**
   * 11. UnsentMessageDelete - Delete pending/uploading messages
   */
  static async unsentMessageDelete(messageIds, userId, conversationId) {
    try {
      const messages = await Message.find({
        _id: { $in: messageIds },
        conversationId,
        senderId: userId,
        status: { $in: ['sending', 'failed'] }
      });

      if (messages.length === 0) {
        return { success: false, error: 'No unsent messages found' };
      }

      // Delete media if exists
      await Promise.all(
        messages.map(async (message) => {
          if (message.mediaUrl) {
            try {
              const urlParts = message.mediaUrl.split('/');
              const publicId = urlParts.slice(-2).join('/').split('.')[0];
              if (publicId) {
                await cloudinary.uploader.destroy(publicId);
              }
            } catch (error) {
              console.error('Error deleting unsent message media:', error);
            }
          }
        })
      );

      // Hard delete unsent messages
      const result = await Message.deleteMany({
        _id: { $in: messages.map(m => m._id) }
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        messageIds: messages.map(m => m._id),
        deleteMode: 'unsent'
      };
    } catch (error) {
      console.error('Error in unsentMessageDelete:', error);
      throw error;
    }
  }

  /**
   * 12. ServerCleanup - Remove orphaned/expired messages
   */
  static async serverCleanup(options = {}) {
    try {
      const {
        deleteOrphaned = true,
        deleteExpiredAutoDelete = true,
        deleteOldSoftDeleted = true,
        softDeleteRetentionDays = 30
      } = options;

      let deletedCount = 0;
      const results = {
        orphaned: 0,
        expiredAutoDelete: 0,
        oldSoftDeleted: 0
      };

      // Delete orphaned messages (conversation doesn't exist)
      if (deleteOrphaned) {
        const conversations = await Conversation.find({}).select('_id');
        const conversationIds = conversations.map(c => c._id);
        
        const orphanedResult = await Message.deleteMany({
          conversationId: { $nin: conversationIds }
        });
        results.orphaned = orphanedResult.deletedCount;
        deletedCount += orphanedResult.deletedCount;
      }

      // Delete expired auto-delete messages
      if (deleteExpiredAutoDelete) {
        const autoDeleteResult = await this.processAutoDelete();
        results.expiredAutoDelete = autoDeleteResult.deletedCount || 0;
        deletedCount += results.expiredAutoDelete;
      }

      // Delete old soft-deleted messages
      if (deleteOldSoftDeleted) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - softDeleteRetentionDays);

        const oldSoftDeleted = await Message.find({
          isDeleted: true,
          'deletionMetadata.hardDeleted': { $ne: true },
          updatedAt: { $lt: cutoffDate }
        });

        const oldSoftDeletedIds = oldSoftDeleted.map(m => m._id);
        
        // Delete media
        await Promise.all(
          oldSoftDeleted.map(async (message) => {
            if (message.mediaUrl) {
              try {
                const urlParts = message.mediaUrl.split('/');
                const publicId = urlParts.slice(-2).join('/').split('.')[0];
                if (publicId) {
                  await cloudinary.uploader.destroy(publicId);
                }
              } catch (error) {
                console.error('Error deleting old soft-deleted media:', error);
              }
            }
          })
        );

        const oldSoftDeletedResult = await Message.deleteMany({
          _id: { $in: oldSoftDeletedIds }
        });
        results.oldSoftDeleted = oldSoftDeletedResult.deletedCount;
        deletedCount += oldSoftDeletedResult.deletedCount;
      }

      return {
        success: true,
        deletedCount,
        results,
        deleteMode: 'serverCleanup'
      };
    } catch (error) {
      console.error('Error in serverCleanup:', error);
      throw error;
    }
  }
}

module.exports = MessageDeletionService;

