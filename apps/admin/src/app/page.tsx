import { redirect } from 'next/navigation';

/**
 * Admin app has no public landing page — root URL always sends operators
 * to the dashboard. The middleware + (admin) layout guards take care of
 * sending unauthenticated visitors to /auth/login from there.
 */
export default function RootPage(): never {
  redirect('/dashboard');
}
