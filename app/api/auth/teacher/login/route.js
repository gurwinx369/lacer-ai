import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, setSessionCookie } from '@/lib/auth';

// Generic error used for all credential failures.
// Never reveal which field was wrong to prevent user enumeration.
const INVALID_CREDENTIALS = 'Invalid email or password';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  // Basic input validation before touching the database.
  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  // Normalize — trim and lowercase consistently (matches User model).
  const normalizedEmail = email.trim().toLowerCase();

  try {
    await connectDB();

    // Select passwordHash explicitly — it's select:false on the schema.
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      // Use a dummy compare to maintain consistent timing.
      // This prevents timing attacks from revealing whether the email exists.
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000');
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // Verify expected role. Teacher credentials submitted to the teacher endpoint
    // must belong to a teacher account.
    if (user.role !== 'teacher') {
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000');
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // Sign JWT — only include safe, minimal claims.
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
    // Log server-side for debugging, but never expose internals to the client.
    console.error('[teacher/login] Unexpected error:', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
