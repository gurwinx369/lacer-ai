import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      // Uniqueness enforced via index below — not just Mongoose metadata.
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      // Never returned to the client — select: false means it must be
      // explicitly requested with .select('+passwordHash').
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['teacher', 'student'],
        message: 'Role must be either teacher or student',
      },
      required: [true, 'Role is required'],
    },
    // Student-only: institution registration ID shown in teacher analytics
    registrationId: { type: String, trim: true, default: null },
    // Gamification — updated after each quiz submission
    xp: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    // ISO date (YYYY-MM-DD) of last activity — used to break/continue streak
    lastActivityDate: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Explicit unique index on email with case-insensitive collation.
// This enforces uniqueness at the database level, not just at schema metadata level.
UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Prevent the model from being redefined on Next.js hot reload.
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
