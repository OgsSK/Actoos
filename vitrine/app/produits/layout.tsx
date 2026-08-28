export const metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function ProduitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}