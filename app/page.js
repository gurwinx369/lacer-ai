import { redirect } from 'next/navigation';

// Root route — redirect to teacher login.
// Student developer will update routing once the student dashboard is built.
export default function RootPage() {
  redirect('/teacher/login');
}
