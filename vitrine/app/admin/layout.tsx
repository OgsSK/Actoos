// Layout admin — pour l'instant transparent.
// L'auth Actoos ID sera ajoutée plus tard en parallèle du password existant.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}