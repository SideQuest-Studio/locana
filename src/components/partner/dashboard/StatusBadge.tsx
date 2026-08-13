// StatusBadge — reusable across dashboard, bookings page, and booking details.
// Add new statuses here; consumers only import the type.

export type BookingStatus =
  | "confirmed"
  | "upcoming"
  | "pending"
  | "cancelled"
  | "checked_in"
  | "checked_out"
  | "expired"
  | "refunded"
  | "refund_pending"
  | "no_show";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  upcoming: { label: "Upcoming", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  checked_in: {
    label: "Checked In",
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
  },
  checked_out: {
    label: "Checked Out",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  expired: {
    label: "Expired",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
  refunded: {
    label: "Refunded",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-400",
  },
  refund_pending: {
    label: "Refund Pending",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  no_show: { label: "No Show", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

interface StatusBadgeProps {
  status: BookingStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClass} ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
