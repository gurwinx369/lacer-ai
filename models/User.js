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
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      required: function () {
        return this.role === 'teacher';
      },
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
    registrationId: {
      type: String,
      trim: true,
      uppercase: true,
      required: function () {
        return this.role === 'student';
      },
    },
    program: {
      type: String,
      trim: true,
      required: function () {
        return this.role === 'student';
      },
    },
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

// Explicit sparse unique index on email for teachers
UserSchema.index(
  { email: 1 },
  { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } }
);

// Explicit sparse unique index on registrationId for students
UserSchema.index(
  { registrationId: 1 },
  { unique: true, sparse: true }
);

// Prevent the model from being redefined on Next.js hot reload.
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
