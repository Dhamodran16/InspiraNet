const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  }, // Use UUID for primary key
  roomId: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values
  }, // Room ID for Google Meet (optional, legacy field)
  host_id: { 
    type: String, 
    required: true 
  }, // User's ID (from auth)
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  start_time: { 
    type: Date, 
    required: true 
  },
  end_time: { 
    type: Date, 
    required: true 
  },
  meet_link: { 
    type: String, 
    required: true 
  }, // hangoutLink from Google
  calendar_link: {
    type: String
  }, // Google Calendar event link
  event_id: { 
    type: String, 
    required: true 
  }, // Google event ID for deletion
  conference_id: {
    type: String
  }, // Google Meet conferenceRecord ID for attendance API
  attendees: [{
    email: { type: String, required: true },
    name: { type: String },
    responseStatus: { 
      type: String, 
      enum: ['accepted', 'declined', 'tentative', 'needsAction'],
      default: 'needsAction'
    }
  }],
  // Expected attendees list for fallback attendance (stored at creation time)
  expected_attendees: [{
    email: { type: String },
    name: { type: String },
    status: { type: String, default: 'invited' }
  }],
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'completed'], 
    default: 'active' 
  },
  // Permanent storage flag - meeting records are never deleted
  isPermanent: {
    type: Boolean,
    default: true
  },
  // Link expiration (1 hour after start, but record remains)
  linkExpiresAt: {
    type: Date
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Attendance tracking schemas
const participantSessionSchema = new mongoose.Schema({
  joinedAt: { type: Date },
  leftAt: { type: Date },
  duration: { type: Number } // minutes
}, { _id: false });

const participantAttendanceSchema = new mongoose.Schema({
  email: { type: String },
  name: { type: String },
  joinTime: { type: Date },
  leaveTime: { type: Date },
  duration: { type: Number }, // minutes
  sessions: { type: [participantSessionSchema], default: [] },
  attendancePercentage: { type: Number },
  attendanceStatus: { type: String, enum: ['Present', 'Partial', 'Absent'] },
  statusColor: { type: String }
}, { _id: false });

// Extend meeting schema with attendance fields
meetingSchema.add({
  total_duration: { type: Number }, // minutes
  attendance: { type: [participantAttendanceSchema], default: [] },
  attendance_conference_id: { type: String },
  attendance_processed_at: { type: Date },
  attendance_summary: {
    totalParticipants: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    partialCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 }
  },
  // In-app presence logs (client-side joins/leaves)
  attendance_logs: [{
    email: { type: String },
    name: { type: String },
    events: [{ type: { type: String, enum: ['join', 'leave'] }, timestamp: { type: Date } }]
  }]
});

// Indexes for better performance
meetingSchema.index({ host_id: 1, status: 1 });
meetingSchema.index({ event_id: 1 }, { unique: true });
meetingSchema.index({ status: 1 });
meetingSchema.index({ start_time: 1 });

// Update the updated_at field before saving
meetingSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Meeting', meetingSchema);

