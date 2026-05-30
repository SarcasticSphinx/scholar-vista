export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth and UI rendering handled by nested layouts (admin/operator)
  return <>{children}</>;
}
