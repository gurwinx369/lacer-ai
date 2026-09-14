import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && v && !process.env[k]) process.env[k] = v;
  }
} catch {}

await mongoose.connect(process.env.MONGODB_URI);

const course = await mongoose.connection.db.collection('courses').findOne({ slug: 'dsa', status: 'ready' });
if (!course) {
  console.log('No DSA course found');
  await mongoose.disconnect();
  process.exit(1);
}

const courseTitle = course.title;
console.log('Canonical course title:', courseTitle);

const result = await mongoose.connection.db.collection('users').updateMany(
  { role: 'student' },
  { $set: { program: courseTitle } }
);
console.log('Students updated:', result.modifiedCount);

const students = await mongoose.connection.db.collection('users').find({ role: 'student' }).toArray();
for (const s of students) {
  console.log({ name: s.name, registrationId: s.registrationId, program: s.program });
}

await mongoose.disconnect();
