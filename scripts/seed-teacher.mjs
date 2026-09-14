/**
 * scripts/seed-teacher.mjs
 *
 * Creates an initial teacher account in MongoDB.
 * Run once to bootstrap the first teacher user.
 *
 * Usage:
 *   node scripts/seed-teacher.mjs
 *
 * Requires MONGODB_URI in .env (or set as environment variable).
 * Uses dotenv to load .env automatically.
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually (no dotenv dependency needed).
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env might not exist — rely on environment variables.
  }
}

loadEnv();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not set. Add it to .env or set it as an environment variable.');
  process.exit(1);
}

// Dynamic imports after env is loaded.
const { default: mongoose } = await import('mongoose');
const { default: bcrypt } = await import('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// Inline minimal User schema to avoid Next.js module resolution issues in scripts.
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- Configure these before running ---
const TEACHER_NAME = 'Teacher Admin';
const TEACHER_EMAIL = 'teacher@lacer.ai';
const TEACHER_PASSWORD = 'changeme123'; // Change immediately after seeding!

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const existing = await User.findOne({ email: TEACHER_EMAIL.toLowerCase().trim() });
  if (existing) {
    console.log(`Teacher account already exists: ${TEACHER_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(TEACHER_PASSWORD, 12);

  const teacher = await User.create({
    name: TEACHER_NAME,
    email: TEACHER_EMAIL.toLowerCase().trim(),
    passwordHash,
    role: 'teacher',
  });

  console.log(`✓ Teacher account created: ${teacher.email} (id: ${teacher._id})`);
  console.log('⚠  Change the password immediately after your first login.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
