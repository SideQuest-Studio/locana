"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingsPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function BookingsPagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: BookingsPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers to display
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between pt-4">
      {/* Left: showing info */}
      <p className="text-sm text-[#64716F]">
        Showing <span className="font-semibold text-[#1F2A2E]">{from}</span> to{" "}
        <span className="font-semibold text-[#1F2A2E]">{to}</span> of{" "}
        <span className="font-semibold text-[#1F2A2E]">{totalCount}</span> bookings
      </p>

      {/* Right: page controls */}
      <div className="flex items-center gap-2">
        {/* Page size selector */}
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
          }}
          className="px-2 py-1.5 rounded-lg border border-[#F0DFC2] bg-white text-sm text-[#1F2A2E] focus:outline-none focus:border-[#1E88E5] cursor-pointer"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-[#F0DFC2] text-[#64716F] hover:bg-[#F0DFC2]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPages().map((page, i) =>
            page === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-[#64716F]">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === page
                    ? "bg-[#1E88E5] text-white"
                    : "border border-[#F0DFC2] text-[#64716F] hover:bg-[#F0DFC2]/60"
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-[#F0DFC2] text-[#64716F] hover:bg-[#F0DFC2]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
