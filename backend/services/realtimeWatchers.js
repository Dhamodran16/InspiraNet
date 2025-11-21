const mongoose = require('mongoose');

let initialized = false;

// Starts MongoDB change streams and emits socket events so the frontend updates automatically
function startRealtimeWatchers(io) {
  const conn = mongoose.connection;

  if (initialized) {
    return;
  }

  if (!io) {
    console.warn('Realtime watchers: Socket server not ready yet. Will retry in 3s');
    setTimeout(() => startRealtimeWatchers(io), 3000);
    return;
  }

  if (!conn || conn.readyState !== 1) {
    console.warn('Realtime watchers: Mongo connection not ready yet. Will retry in 3s');
    setTimeout(() => startRealtimeWatchers(io), 3000);
    return;
  }

  try {
    // Notifications: push to specific user room
    const notifications = conn.collection('notifications');
    notifications.watch([], { fullDocument: 'updateLookup' }).on('change', (change) => {
      if (change.operationType === 'insert') {
        const n = change.fullDocument;
        if (!n || !n.recipientId) return;
        io.to(`user_${n.recipientId.toString()}`).emit('new_notification', n);
      } else if (change.operationType === 'update' || change.operationType === 'replace') {
        const n = change.fullDocument;
        if (!n || !n.recipientId) return;
        io.to(`user_${n.recipientId.toString()}`).emit('notification_updated', n);
      }
    });

    // Posts: broadcast creates/updates globally (clients can filter)
    const posts = conn.collection('posts');
    posts.watch([], { fullDocument: 'updateLookup' }).on('change', (change) => {
      const doc = change.fullDocument;
      if (!doc) return;
      if (change.operationType === 'insert') {
        io.emit('new_post', { post: doc });
      } else if (change.operationType === 'update' || change.operationType === 'replace') {
        io.emit('post_updated', { post: doc });
      } else if (change.operationType === 'delete') {
        io.emit('post_deleted', { postId: change.documentKey?._id });
      }
    });

    // Events: broadcast updates
    const events = conn.collection('events');
    events.watch([], { fullDocument: 'updateLookup' }).on('change', (change) => {
      const doc = change.fullDocument;
      if (!doc) return;
      io.emit('event_update', { event: doc });
    });

    // Users: notify user_profile_updated for self
    const users = conn.collection('users');
    users.watch([], { fullDocument: 'updateLookup' }).on('change', (change) => {
      const user = change.fullDocument;
      if (!user) return;
      io.to(`user_${user._id.toString()}`).emit('user_profile_updated', {
        userId: user._id,
        user
      });
    });

    // Configuration: broadcast to all
    const settings = conn.collection('configurations');
    settings.watch([], { fullDocument: 'updateLookup' }).on('change', () => {
      io.emit('configuration_updated');
    });

    initialized = true;
    console.log('✅ Realtime Mongo watchers started');
  } catch (err) {
    console.error('Failed to start realtime watchers:', err);
  }
}

module.exports = { startRealtimeWatchers };


