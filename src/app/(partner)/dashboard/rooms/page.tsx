function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2A2E]">{title}</h1>
      <div className="rounded-2xl border border-dashed border-[#F0DFC2] bg-white/60 p-12 text-center text-sm text-[#64716F]">
        Coming soon — {title.toLowerCase()} management.
      </div>
    </div>
  );
}

export default function RoomsPage() {
  return <Placeholder title="Rooms" />;
}
