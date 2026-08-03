export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Bookings</h1>
        <p className="text-sm text-[#64716F] mt-1">Your upcoming and past stays</p>
      </div>
      <div className="rounded-2xl border border-dashed border-[#F0DFC2] bg-white/60 p-12 text-center">
        <p className="text-[#64716F] text-sm">No bookings yet.</p>
        <p className="text-xs text-[#64716F]/80 mt-2">When you book a stay, it will appear here.</p>
      </div>
    </div>
  );
}
