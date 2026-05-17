import "leaflet/dist/leaflet.css";

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
