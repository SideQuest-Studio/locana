"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  X,
} from "lucide-react";

export interface Group74DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onDatesChange: (checkIn: string, checkOut: string) => void;
  onClose?: () => void;
  standalone?: boolean;
}

// Helpers for pure calendar calculations without heavy date libraries
function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYMD(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str: string): string {
  const d = parseYMD(str);
  if (!d) return "Select date";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Group74DateRangePicker({
  checkIn,
  checkOut,
  onDatesChange,
  onClose,
  standalone = false,
}: Group74DateRangePickerProps) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const parsed = parseYMD(checkIn);
    return parsed || new Date();
  });

  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">(
    checkIn && !checkOut ? "checkOut" : "checkIn"
  );

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year1 = currentMonthDate.getFullYear();
  const month1 = currentMonthDate.getMonth();

  const nextMonthDate = new Date(year1, month1 + 1, 1);
  const year2 = nextMonthDate.getFullYear();
  const month2 = nextMonthDate.getMonth();

  // Selected date ranges
  const checkInDate = parseYMD(checkIn);
  const checkOutDate = parseYMD(checkOut);

  // Calculate nights
  const nightsCount = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // Handle click on a date cell
  const handleDateClick = (dateStr: string) => {
    const clicked = parseYMD(dateStr);
    if (!clicked || clicked < today) return;

    if (activeField === "checkIn" || !checkIn) {
      onDatesChange(dateStr, "");
      setActiveField("checkOut");
    } else if (activeField === "checkOut") {
      if (checkIn && dateStr <= checkIn) {
        // Reset check-in if user clicks earlier date
        onDatesChange(dateStr, "");
        setActiveField("checkOut");
      } else {
        onDatesChange(checkIn, dateStr);
        setActiveField("checkIn");
      }
    }
  };

  // Quick Preset Handlers
  const handlePresetThisWeekend = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    onDatesChange(formatYMD(friday), formatYMD(sunday));
    setActiveField("checkIn");
  };

  const handlePresetNextWeekend = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 + 7;
    const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    onDatesChange(formatYMD(friday), formatYMD(sunday));
    setActiveField("checkIn");
  };

  const handlePreset3Days = () => {
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    onDatesChange(formatYMD(start), formatYMD(end));
    setActiveField("checkIn");
  };

  const handleClear = () => {
    onDatesChange("", "");
    setActiveField("checkIn");
  };

  // Render a calendar month grid
  const renderMonth = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: React.ReactNode[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const cellDateStr = formatYMD(cellDate);
      const isPast = cellDate < today;
      const isToday = cellDateStr === formatYMD(today);

      const isStart = checkIn === cellDateStr;
      const isEnd = checkOut === cellDateStr;

      let inRange = false;
      if (checkIn && checkOut) {
        inRange = cellDateStr > checkIn && cellDateStr < checkOut;
      } else if (checkIn && hoverDate && activeField === "checkOut") {
        inRange = cellDateStr > checkIn && cellDateStr <= hoverDate;
      }

      cells.push(
        <button
          key={cellDateStr}
          type="button"
          disabled={isPast}
          onClick={() => handleDateClick(cellDateStr)}
          onMouseEnter={() => !isPast && setHoverDate(cellDateStr)}
          onMouseLeave={() => setHoverDate(null)}
          className={`h-9 w-9 text-xs font-semibold rounded-lg relative transition-all flex items-center justify-center cursor-pointer ${
            isPast
              ? "text-[#A8AD9C]/40 cursor-not-allowed"
              : isStart || isEnd
              ? "bg-[#05326B] text-white font-bold shadow-xs scale-105 z-10"
              : inRange
              ? "bg-[#EBF2FC] text-[#05326B] rounded-none font-bold"
              : "text-[#132555] hover:bg-[#F0F4FA] hover:text-[#005CE5]"
          } ${isStart && checkOut ? "rounded-r-none" : ""} ${
            isEnd && checkIn ? "rounded-l-none" : ""
          }`}
        >
          <span>{day}</span>
          {isToday && !isStart && !isEnd && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#005CE5]" />
          )}
        </button>
      );
    }

    return (
      <div className="flex-1 min-w-[250px]">
        <div className="text-center font-bold text-xs text-[#132555] mb-3">
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAY_NAMES.map((d) => (
            <span key={d} className="text-[10px] font-bold text-[#57617E]">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-[14px] shadow-[0_20px_50px_-10px_rgba(1,35,78,0.22)] border border-[#E5E9F2] overflow-hidden ${
        standalone ? "w-full max-w-2xl mx-auto" : "w-full"
      }`}
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-[#F8FAFD] border-b border-[#E5E9F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#005CE5]/10 flex items-center justify-center">
            <CalendarIcon className="h-3.5 w-3.5 text-[#005CE5]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#132555] tracking-tight">
              {nightsCount > 0
                ? `${nightsCount} Night${nightsCount > 1 ? "s" : ""} Stay in Quezon`
                : "Select Check-in & Check-out Dates"}
            </h4>
            <p className="text-[10px] text-[#57617E]">
              {checkIn && checkOut
                ? `${formatDisplayDate(checkIn)} → ${formatDisplayDate(checkOut)}`
                : "Choose your stay window for live rates & availability"}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#57617E] hover:text-[#132555] hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date Pill Toggle Bar */}
      <div className="p-3 bg-white border-b border-[#F0F4FA] flex flex-col sm:flex-row items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-2 w-full">
          {/* Check-in Tab */}
          <button
            type="button"
            onClick={() => setActiveField("checkIn")}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeField === "checkIn"
                ? "border-[#005CE5] bg-[#EBF2FC] ring-2 ring-[#005CE5]/20"
                : "border-[#E5E9F2] bg-[#F8FAFD] hover:bg-white"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] block">
              Check-in
            </span>
            <span className="text-xs font-bold text-[#132555] truncate block mt-0.5">
              {checkIn ? formatDisplayDate(checkIn) : "Add date"}
            </span>
          </button>

          {/* Check-out Tab */}
          <button
            type="button"
            onClick={() => setActiveField("checkOut")}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeField === "checkOut"
                ? "border-[#005CE5] bg-[#EBF2FC] ring-2 ring-[#005CE5]/20"
                : "border-[#E5E9F2] bg-[#F8FAFD] hover:bg-white"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] block">
              Check-out
            </span>
            <span className="text-xs font-bold text-[#132555] truncate block mt-0.5">
              {checkOut ? formatDisplayDate(checkOut) : "Add date"}
            </span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePresetThisWeekend}
            className="px-2.5 py-2 text-[11px] font-bold text-[#132555] bg-[#F8FAFD] hover:bg-[#EBF2FC] border border-[#E5E9F2] rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            This Weekend
          </button>
          <button
            type="button"
            onClick={handlePresetNextWeekend}
            className="px-2.5 py-2 text-[11px] font-bold text-[#132555] bg-[#F8FAFD] hover:bg-[#EBF2FC] border border-[#E5E9F2] rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Next Weekend
          </button>
          <button
            type="button"
            onClick={handlePreset3Days}
            className="px-2.5 py-2 text-[11px] font-bold text-[#132555] bg-[#F8FAFD] hover:bg-[#EBF2FC] border border-[#E5E9F2] rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            3 Days
          </button>
        </div>
      </div>

      {/* Dual Calendar Body */}
      <div className="p-4 bg-white relative">
        {/* Month Nav Buttons */}
        <div className="flex items-center justify-between absolute top-4 left-4 right-4 z-10 pointer-events-none">
          <button
            type="button"
            onClick={prevMonth}
            className="pointer-events-auto p-1.5 rounded-lg bg-white border border-[#E5E9F2] hover:bg-[#F0F4FA] text-[#132555] shadow-2xs transition-colors cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="pointer-events-auto p-1.5 rounded-lg bg-white border border-[#E5E9F2] hover:bg-[#F0F4FA] text-[#132555] shadow-2xs transition-colors cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dual Month Grids */}
        <div className="flex flex-col sm:flex-row gap-6 pt-1">
          {renderMonth(year1, month1)}
          <div className="hidden sm:block w-px bg-[#F0F4FA]" />
          {renderMonth(year2, month2)}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-4 py-3 bg-[#F8FAFD] border-t border-[#E5E9F2] flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#57617E] hover:text-[#132555] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Dates</span>
        </button>

        <div className="flex items-center gap-2">
          {nightsCount > 0 && (
            <span className="text-xs font-bold text-[#01864C] bg-[#01864C]/10 px-2.5 py-1 rounded-md">
              {nightsCount} {nightsCount === 1 ? "night" : "nights"}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
            >
              Apply Dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
