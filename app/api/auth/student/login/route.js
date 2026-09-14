import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, setSessionCookie } from '@/lib/auth';

const INVALID_CREDENTIALS = 'Invalid Registration ID or password';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { registrationId, password } = body;

  if (!registrationId || typeof registrationId !== 'string' || !registrationId.trim()) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const normalizedRegistrationId = registrationId.trim().toUpperCase();

  try {
    await connectDB();

    const user = await User.findOne({ registrationId: normalizedRegistrationId, role: 'student' }).select('+passwordHash');

    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000');
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const token = await signToken({
      userId: user._id.toString(),
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
