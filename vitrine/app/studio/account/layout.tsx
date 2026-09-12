export const dynamic = 'force-dynamic';
import { AuthProvider } from '../../context/AuthContext';
import StudioGuard from './StudioGuard';

export default function StudioAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <StudioGuard>{children}</StudioGuard>
    </AuthProvider>
  );
}