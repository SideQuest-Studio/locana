"use client";

import { useState } from "react";
import {
  Search,
  CalendarDays,
  SlidersHorizontal,
  Download,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingsFilters {
  search: string;
  status: string;
  listing: string;
  location: string;
  startDate: string;
  endDate: string;
  sortBy: string;
}

interface BookingsToolbarProps {
  filters: BookingsFilters;
  onFilterChange: (filters: BookingsFilters) => void;
  totalCount: number;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#F0DFC2] bg-white text-sm font-medium text-[#1F2A2E] hover:border-[#1E88E5]/40 transition-colors whitespace-nowrap"
      >
        <span className="text-[#64716F]">{label}:</span>
        <span className="font-semibold">{selected?.label ?? label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#64716F]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-[#F0DFC2] shadow-xl py-1.5 z-50 animate-fadeIn">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === opt.value
                    ? "bg-[#1E88E5]/10 text-[#1E88E5] font-semibold"
                    : "text-[#1F2A2E] hover:bg-[#F0DFC2]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingsToolbar({
  filters,
  onFilterChange,
  totalCount,
  viewMode,
  onViewModeChange,
}: BookingsToolbarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [localDates, setLocalDates] = useState({
    start: filters.startDate,
    end: filters.endDate,
  });

  const update = (partial: Partial<BookingsFilters>) =>
    onFilterChange({ ...filters, ...partial });

  const hasActiveFilters =
    filters.status || filters.listing || filters.location || filters.startDate || filters.endDate;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Search + main controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md px-3 py-2 rounded-xl border border-[#F0DFC2] bg-white">
          <Search className="h-4 w-4 text-[#64716F] shrink-0" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search bookings..."
            className="bg-transparent text-sm text-[#1F2A2E] placeholder-[#A8AD9C] focus:outline-none w-full"
          />
          {filters.search && (
            <button onClick={() => update({ search: "" })} className="shrink-0">
              <X className="h-3.5 w-3.5 text-[#64716F] hover:text-[#1F2A2E]" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <FilterDropdown
          label="Status"
          value={filters.status}
          onChange={(val) => update({ status: val })}
          options={[
            { value: "", label: "All Status" },
            { value: "confirmed", label: "Confirmed" },
            { value: "pending_payment", label: "Pending" },
            { value: "checked_in", label: "Checked In" },
            { value: "checked_out", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />

        {/* Date range */}
        <div className="relative">
          <button
            onClick={() => setDateOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#F0DFC2] bg-white text-sm font-medium text-[#1F2A2E] hover:border-[#1E88E5]/40 transition-colors whitespace-nowrap"
          >
            <CalendarDays className="h-4 w-4 text-[#64716F]" />
            <span>
              {filters.startDate && filters.endDate
                ? `${filters.startDate} – ${filters.endDate}`
                : "Date Range"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64716F]" />
          </button>
          {dateOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDateOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border border-[#F0DFC2] shadow-xl p-4 z-50 animate-fadeIn">
                <p className="text-xs font-bold text-[#64716F] uppercase tracking-wide mb-3">
                  Date Range
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#64716F] mb-1 block">
                      Start
                    </label>
                    <input
                      type="date"
                      value={localDates.start}
                      onChange={(e) =>
                        setLocalDates((d) => ({ ...d, start: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-sm text-[#1F2A2E] focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#64716F] mb-1 block">
                      End
                    </label>
                    <input
                      type="date"
                      value={localDates.end}
                      onChange={(e) =>
                        setLocalDates((d) => ({ ...d, end: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-sm text-[#1F2A2E] focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      update({ startDate: localDates.start, endDate: localDates.end });
                      setDateOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1565C0] transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setLocalDates({ start: "", end: "" });
                      update({ startDate: "", endDate: "" });
                      setDateOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#F0DFC2]/50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={() =>
                onFilterChange({
                  search: "",
                  status: "",
                  listing: "",
                  location: "",
                  startDate: "",
                  endDate: "",
                  sortBy: filters.sortBy,
                })
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#F0DFC2] bg-white text-xs font-semibold text-[#64716F] hover:border-[#1E88E5]/40 hover:text-[#1E88E5] transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          {/* View toggles */}
          <div className="flex items-center rounded-xl border border-[#F0DFC2] overflow-hidden">
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-[#1E88E5] text-white"
                  : "bg-white text-[#64716F] hover:bg-[#F0DFC2]/60"
              }`}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-[#1E88E5] text-white"
                  : "bg-white text-[#64716F] hover:bg-[#F0DFC2]/60"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
