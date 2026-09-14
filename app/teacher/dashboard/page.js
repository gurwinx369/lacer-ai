import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import DashboardShell from './DashboardShell';

export const metadata = {
  title: 'Dashboard — Lacer AI',
  description: 'Teacher dashboard for Lacer AI',
};

export default async function TeacherDashboardPage() {
  // --- Authorization ---
  // Server-side: read session from cookie, never from request body.
  const session = await getSession();

  if (!session) {
    redirect('/teacher/login');
  }

  if (session.role !== 'teacher') {
    // Authenticated but wrong role.
    redirect('/teacher/login');
  }

  // --- Data ---
  // Simple, isolated queries — no analytics abstraction.
  // Returns 0 when no students exist yet; never fabricates data.
  let studentCount = 0;
  let laggingCount = 0;
  let goodCount = 0;

  try {
    await connectDB();
    studentCount = await User.countDocuments({ role: 'student' });
    // Lagging/good classification requires quiz attempt data that doesn't exist yet.
    // These will be real values once StudentMastery is implemented.
    laggingCount = 0;
    goodCount = 0;
  } catch (err) {
    // Non-fatal — dashboard still renders with zeroes.
    console.error('[teacher/dashboard] Stats query failed:', err.message);
  }

  const stats = {
    studentCount,
    laggingCount,
    goodCount,
  };

  return (
    <DashboardShell
      teacherName={session.email}
      stats={stats}
    />
  );
}
