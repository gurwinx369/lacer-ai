import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  return clearSessionCookie(response);
}
