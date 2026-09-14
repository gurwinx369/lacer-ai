import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { getTeacherDashboardAnalytics } from '@/lib/teacher-dashboard';
import DashboardShell from './DashboardShell';

export const metadata = {
  title: 'Dashboard — Lacer AI',
  description: 'Teacher dashboard for Lacer AI',
};

export default async function TeacherDashboardPage() {
  const session = await getSession();

  if (!session) redirect('/teacher/login');
  if (session.role !== 'teacher') redirect('/teacher/login');

  let dsaCourse = null;
  let analytics = null;

  try {
    await connectDB();
    dsaCourse = await Course.findOne({
      slug: 'dsa',
      createdBy: session.userId,
    }).lean();

    if (dsaCourse) {
      analytics = await getTeacherDashboardAnalytics({
        teacherId: session.userId,
        dsaCourse,
      });
    }
  } catch (err) {
    console.error('[teacher/dashboard] Data query failed:', err.message);
  }

  return (
    <DashboardShell
      teacherName={session.email}
      dsaCourse={dsaCourse ? JSON.parse(JSON.stringify(dsaCourse)) : null}
      analytics={analytics ? JSON.parse(JSON.stringify(analytics)) : null}
    />
  );
}
