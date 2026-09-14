import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, setSessionCookie } from '@/lib/auth';

// Generic error — same message regardless of which field failed.
const INVALID_CREDENTIALS = 'Invalid email or password';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    await connectDB();

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000');
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // This is the student endpoint — reject non-student accounts.
    if (user.role !== 'student') {
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000');
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      { success: true, role: user.role },
      { status: 200 }
    );

    return setSessionCookie(response, token);
  } catch (err) {
    console.error('[student/login] Unexpected error:', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
