import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Student Dashboard — Lacer AI',
  description: 'Your learning roadmap',
};

export default async function StudentDashboardPage() {
  const session = await getSession();

  if (!session) redirect('/student/login');
  if (session.role !== 'student') {
    // If a teacher somehow navigates here, send them to their own dashboard
    redirect('/teacher/dashboard');
  }

  let studentName = 'Student';
  try {
    await connectDB();
    const user = await User.findById(session.userId).lean();
    if (user?.name) {
      studentName = user.name;
    }
  } catch (err) {
    console.error('[student/dashboard] Failed to load user:', err.message);
  }

  return <DashboardClient studentName={studentName} />;
}
