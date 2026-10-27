import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { can, PERMISSIONS, type SessionUser } from '@/lib/auth/permissions';
import { fetchServerPermissions } from '@/lib/auth/serverPermissions';
import { logSecurityAudit } from '@/lib/auth/auditLog';
import PublicRouteLoading from '@/components/PublicRouteLoading';
import ReportPageContent from '@/components/ReportPageContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'แจ้งงานนอกสัญญา',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReportOocPage() {
  const session = await getServerSession(authOptions);

  // 1. ผู้ใช้ไม่ได้ยืนยันตัวตน (Unauthenticated) -> redirect ไปหน้าล็อกอินพร้อม returnTo
  if (!session || !session.user) {
    logSecurityAudit({
      event: 'UNAUTHENTICATED_ACCESS_ATTEMPT',
      path: '/public/report-ooc',
      reason: 'Unauthenticated user attempted to access OOC report page',
    });
    redirect('/login?returnTo=' + encodeURIComponent('/public/report-ooc'));
  }

  // 2. ดึง permissions ที่แท้จริงจาก Server
  const token = (session as { accessToken?: string })?.accessToken;
  const permissions = await fetchServerPermissions(token);

  const sessionUser: SessionUser = {
    id: (session as { userId?: string })?.userId ?? (session.user as { id?: string })?.id,
    name: session.user.name,
    email: (session.user as { email?: string })?.email,
    role: (session as { userRole?: string })?.userRole ?? (session.user as { role?: string })?.role,
    permissions,
  };

  // 3. ยืนยันตัวตนแล้วแต่ไม่มีสิทธิ์ตาม Authorization Matrix -> ส่งคืน 404 Not Found (ไม่ใช่ 403)
  // เพื่อปกปิดความมีอยู่ของทรัพยากรและฟังก์ชันงานนอกสัญญา
  if (!can(sessionUser, PERMISSIONS.OOC_VIEW)) {
    logSecurityAudit({
      event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      userId: sessionUser.id,
      role: sessionUser.role,
      path: '/public/report-ooc',
      reason: 'User lacks OOC_VIEW permission (404 Not Found returned)',
    });
    notFound();
  }

  return (
    <Suspense
      fallback={
        <PublicRouteLoading
          title="กำลังโหลดหน้าแจ้งปัญหานอกสัญญา..."
          description="กำลังเตรียมข้อมูลเริ่มต้นของแบบฟอร์ม"
        />
      }
    >
      <ReportPageContent forceOutOfContract={true} />
    </Suspense>
  );
}
