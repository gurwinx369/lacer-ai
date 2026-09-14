import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, registrationId, password } = body;
  // program field is now ignored from client — we derive it from the canonical course
  // to ensure consistent matching in teacher analytics.

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!registrationId || typeof registrationId !== 'string' || !registrationId.trim()) {
    return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const normalizedRegistrationId = registrationId.trim().toUpperCase();

  try {
    await connectDB();

    // Derive program from the canonical DSA course title so that
    // User.program === Course.title is always true for the teacher dashboard query.
    const dsaCourse = await Course.findOne({ slug: 'dsa', status: 'ready' })
      .select('title')
      .lean();

    if (!dsaCourse) {
      return NextResponse.json(
        { error: 'The course is not yet available for registration. Please try again later.' },
        { status: 503 }
      );
    }

    const existingUser = await User.findOne({ registrationId: normalizedRegistrationId, role: 'student' });
    if (existingUser) {
      return NextResponse.json({ error: 'Account with this Registration ID already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: trimmedName,
      registrationId: normalizedRegistrationId,
      // Always set program = canonical course title so teacher dashboard finds this student.
      program: dsaCourse.title,
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
      return NextResponse.json({ error: 'Account with this Registration ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
