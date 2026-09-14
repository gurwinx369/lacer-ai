import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, registrationId, program, password } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!registrationId || typeof registrationId !== 'string' || !registrationId.trim()) {
    return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
  }
  if (!program || typeof program !== 'string' || !program.trim()) {
    return NextResponse.json({ error: 'Program / Course is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const normalizedRegistrationId = registrationId.trim().toUpperCase();
  const trimmedProgram = program.trim();

  try {
    await connectDB();

    const existingUser = await User.findOne({ registrationId: normalizedRegistrationId, role: 'student' });
    if (existingUser) {
      return NextResponse.json({ error: 'Account with this Registration ID already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: trimmedName,
      registrationId: normalizedRegistrationId,
      program: trimmedProgram,
      passwordHash,
      role: 'student',
    });

    await newUser.save();

    const token = await signToken({
      userId: newUser._id.toString(),
      role: newUser.role,
    });

    const response = NextResponse.json(
      { success: true, role: newUser.role },
      { status: 201 }
    );

    return setSessionCookie(response, token);
  } catch (err) {
    console.error('[student/register] Unexpected error:', err.message);
    if (err.code === 11000) {
      // MongoDB duplicate key error (if the index enforcement catches it)
      return NextResponse.json({ error: 'Account with this Registration ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
