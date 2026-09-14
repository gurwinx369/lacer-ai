import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import DashboardShell from './DashboardShell';

export const metadata = {
  title: 'Dashboard — Lacer AI',
  description: 'Teacher dashboard for Lacer AI',
};

export default async function TeacherDashboardPage() {
  const session = await getSession();

  if (!session) redirect('/teacher/login');
  if (session.role !== 'teacher') redirect('/teacher/login');

  let studentCount = 0;
  let laggingCount = 0;
  let goodCount = 0;
  let dsaCourse = null;

  try {
    await connectDB();
    studentCount = await User.countDocuments({ role: 'student' });
    laggingCount = 0; // Will be real once StudentMastery is implemented.
    goodCount = 0;
    dsaCourse = await Course.findOne({
      slug: 'dsa',
      createdBy: session.userId,
    }).lean();
  } catch (err) {
    console.error('[teacher/dashboard] Data query failed:', err.message);
  }

  return (
    <DashboardShell
      teacherName={session.email}
      stats={{ studentCount, laggingCount, goodCount }}
      dsaCourse={dsaCourse ? JSON.parse(JSON.stringify(dsaCourse)) : null}
    />
  );
}
