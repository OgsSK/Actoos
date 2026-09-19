import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fffafa] flex flex-col">
      <Header />
      <main className="pt-16 flex-1">{children}</main>
      <Footer />
    </div>
  );
}