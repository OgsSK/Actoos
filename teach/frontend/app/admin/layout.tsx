'use client';

import AdminGuard from './AdminGuard';
import AdminHeader from './components/AdminHeader';
import AdminNav from './components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <AdminHeader />
        <AdminNav />
        <main>{children}</main>
      </div>
    </AdminGuard>
  );
}