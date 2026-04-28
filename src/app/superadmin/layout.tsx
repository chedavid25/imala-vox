import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { SuperAdminNav } from './SuperAdminNav';

const getAdminJwtSecret = () => {
  const key = process.env.ADMIN_JWT_SECRET || 'fallback-secret-dev-only';
  return new TextEncoder().encode(key);
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('imala-admin-session')?.value;

  if (!token) {
    redirect('/auth');
  }

  try {
    await jwtVerify(token, getAdminJwtSecret());
  } catch {
    redirect('/auth');
  }

  return <SuperAdminNav>{children}</SuperAdminNav>;
}
