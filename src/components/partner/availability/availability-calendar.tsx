"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  BedDouble,
  RotateCcw,
} from "lucide-react";
import type { RoomType } from "@/src/types/database.types";
import {
  fetchMonthlyAvailability,
  saveDailyOverride,
  bulkUpdateAvailability,
  resetAvailabilityDates,
  type DayAvailabilityRecord,
  type BulkOverrideInput,
} from "@/src/actions/partner/availability";

interface AvailabilityCalendarProps {
  propertyId: string;
  roomTypes: RoomType[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilityCalendar({
  propertyId,
  roomTypes,
}: AvailabilityCalendarProps) {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(
    roomTypes[0]?.id || ""
  );

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-indexed (1..12)

  const [loading, setLoading] = useState(false);
  const [daysData, setDaysData] = useState<Record<string, DayAvailabilityRecord>>({});
  const [basePrice, setBasePrice] = useState<number>(2500);
  const [totalInventory, setTotalInventory] = useState<number>(5);

  // Single Day Override Modal
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [singleAvailable, setSingleAvailable] = useState<number>(5);
  const [singlePrice, setSinglePrice] = useState<string>("");
  const [singleMinStay, setSingleMinStay] = useState<string>("");
  const [singleClosedArrival, setSingleClosedArrival] = useState(false);
  const [singleClosedDeparture, setSingleClosedDeparture] = useState(false);
  const [singleIsBlocked, setSingleIsBlocked] = useState(false);

  // Bulk Update Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState<string>("");
  const [bulkEndDate, setBulkEndDate] = useState<string>("");
  const [bulkAvailable, setBulkAvailable] = useState<number>(5);
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkMinStay, setBulkMinStay] = useState<string>("");
  const [bulkIsBlocked, setBulkIsBlocked] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRoomType = roomTypes.find((rt) => rt.id === selectedRoomTypeId);

  // Load monthly data
  const loadMonthData = async (rtId: string, yr: number, mo: number) => {
    if (!rtId) return;
    setLoading(true);
    const res = await fetchMonthlyAvailability(rtId, yr, mo);
    setLoading(false);

    if (res.success) {
      setDaysData(res.data.days);
      setBasePrice(res.data.basePrice);
      setTotalInventory(res.data.totalInventory);
    } else {
      setErrorMessage(res.error.message);
    }
  };

  useEffect(() => {
    if (selectedRoomTypeId) {
      loadMonthData(selectedRoomTypeId, currentYear, currentMonth);
    }
  }, [selectedRoomTypeId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Open single day modal
  const handleDateClick = (dateKey: string) => {
    const record = daysData[dateKey];
    setSelectedDateKey(dateKey);
    if (record) {
      setSingleAvailable(record.available_count);
      setSinglePrice(record.price_override ? String(record.price_override) : "");
      setSingleMinStay(record.minimum_stay ? String(record.minimum_stay) : "");
      setSingleClosedArrival(record.closed_to_arrival);
      setSingleClosedDeparture(record.closed_to_departure);
      setSingleIsBlocked(record.available_count === 0);
    } else {
      setSingleAvailable(totalInventory);
      setSinglePrice("");
      setSingleMinStay("");
      setSingleClosedArrival(false);
      setSingleClosedDeparture(false);
      setSingleIsBlocked(false);
    }
  };

  const handleSaveSingleDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateKey || !selectedRoomTypeId) return;

    const availableCount = singleIsBlocked ? 0 : Number(singleAvailable);
    const priceOverride = singlePrice ? Number(singlePrice) : null;
    const minStay = singleMinStay ? Number(singleMinStay) : null;

    startTransition(async () => {
      const res = await saveDailyOverride({
        room_type_id: selectedRoomTypeId,
        date: selectedDateKey,
        available_count: availableCount,
        price_override: priceOverride,
        minimum_stay: minStay,
        closed_to_arrival: singleClosedArrival,
        closed_to_departure: singleClosedDeparture,
      });

      if (!res.success) {
        alert(res.error.message);
      } else {
        setDaysData((prev) => ({
          ...prev,
          [selectedDateKey]: {
            date: selectedDateKey,
            available_count: availableCount,
            price: priceOverride !== null ? priceOverride : basePrice,
            is_override: true,
            price_override: priceOverride,
            minimum_stay: minStay,
            closed_to_arrival: singleClosedArrival,
            closed_to_departure: singleClosedDeparture,
            is_blocked: availableCount === 0,
          },
        }));
        setSelectedDateKey(null);
        setSuccessMessage(`Updated availability for ${selectedDateKey}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });
  };

  const handleResetSingleDay = () => {
    if (!selectedDateKey || !selectedRoomTypeId) return;

    startTransition(async () => {
      const res = await resetAvailabilityDates(
        selectedRoomTypeId,
        selectedDateKey,
        selectedDateKey
      );

      if (!res.success) {
        alert(res.error.message);
      } else {
        setDaysData((prev) => ({
          ...prev,
          [selectedDateKey]: {
            date: selectedDateKey,
            available_count: totalInventory,
            price: basePrice,
            is_override: false,
            price_override: null,
            minimum_stay: null,
            closed_to_arrival: false,
            closed_to_departure: false,
            is_blocked: false,
          },
        }));
        setSelectedDateKey(null);
        setSuccessMessage(`Reset ${selectedDateKey} to default settings.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });
  };

  const handleOpenBulkModal = () => {
    const startStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    setBulkStartDate(startStr);
    setBulkEndDate(endStr);
    setBulkAvailable(totalInventory);
    setBulkPrice("");
    setBulkMinStay("");
    setBulkIsBlocked(false);
    setIsBulkModalOpen(true);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomTypeId || !bulkStartDate || !bulkEndDate) return;

    const availableCount = bulkIsBlocked ? 0 : Number(bulkAvailable);
    const priceOverride = bulkPrice ? Number(bulkPrice) : null;
    const minStay = bulkMinStay ? Number(bulkMinStay) : null;

    const payload: BulkOverrideInput = {
      room_type_id: selectedRoomTypeId,
      start_date: bulkStartDate,
      end_date: bulkEndDate,
      available_count: availableCount,
      price_override: priceOverride,
      minimum_stay: minStay,
      closed_to_arrival: false,
      closed_to_departure: false,
    };

    startTransition(async () => {
      const res = await bulkUpdateAvailability(payload);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setIsBulkModalOpen(false);
        setSuccessMessage(`Successfully updated ${res.data.updatedCount} dates!`);
        setTimeout(() => setSuccessMessage(null), 3500);
        // Refresh full month
        loadMonthData(selectedRoomTypeId, currentYear, currentMonth);
      }
    });
  };

  // Generate calendar grid dates
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Compute month summary statistics
  const monthDayList = Object.values(daysData);
  const customOverrideCount = monthDayList.filter((d) => d.is_override).length;
  const blockedDaysCount = monthDayList.filter((d) => d.is_blocked).length;
  const avgPrice = monthDayList.length > 0
    ? Math.round(
        monthDayList.reduce((acc, curr) => acc + curr.price, 0) /
          monthDayList.length
      )
    : basePrice;

  if (roomTypes.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
        <BedDouble className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1F2A2E]">No room types available</h2>
        <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
          Please create at least one room type first before managing the availability calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header & Room Switcher ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A2E]">Availability & Rates Calendar</h1>
          <p className="text-sm text-[#64716F] mt-1">
            Manage date-by-date inventory counts, block out dates, and apply seasonal / holiday price overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenBulkModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#F0DFC2] text-[#1F2A2E] text-xs font-semibold hover:bg-[#FAF7F2] shadow-sm transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-[#1E88E5]" />
            Bulk Update Dates
          </button>
        </div>
      </div>

      {/* ── Room Type Selector Bar ──────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {roomTypes.map((rt) => {
          const isSelected = rt.id === selectedRoomTypeId;
          return (
            <button
              key={rt.id}
              onClick={() => setSelectedRoomTypeId(rt.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? "bg-[#1E88E5] text-white shadow-sm"
                  : "bg-white border border-[#F0DFC2] text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>{rt.name_en}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                ₱{Number(rt.base_price).toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Monthly Overview KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Base Rate</p>
          <p className="text-xl font-bold text-[#1F2A2E] mt-1">
            ₱{basePrice.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Standard nightly price</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Default Inventory</p>
          <p className="text-xl font-bold text-[#1F2A2E] mt-1">{totalInventory} Units</p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Max capacity per night</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Custom Overrides</p>
          <p className="text-xl font-bold text-[#1E88E5] mt-1">{customOverrideCount} Days</p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Rates or blocks modified</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-700">Blocked Dates</p>
          <p className="text-xl font-bold text-amber-800 mt-1">{blockedDaysCount} Days</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Closed to reservations</p>
        </div>
      </div>

      {/* ── Main Calendar Grid Card ─────────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 shadow-sm">
        {/* Month Navigator Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#F0DFC2]">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-[#1E88E5]" />
            <h2 className="text-lg font-bold text-[#1F2A2E]">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h2>
            {loading && (
              <span className="flex items-center gap-1 text-xs text-[#64716F] font-medium animate-pulse">
                <Clock className="w-3.5 h-3.5" /> Refreshing...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg border border-[#F0DFC2] text-[#64716F] hover:bg-[#FAF7F2] transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg border border-[#F0DFC2] text-[#64716F] hover:bg-[#FAF7F2] transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mt-4 text-center">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div
              key={day}
              className={`py-2 text-[11px] font-bold uppercase tracking-wider ${
                idx === 0 || idx === 6 ? "text-amber-700 bg-amber-50/50 rounded-lg" : "text-[#64716F]"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-2 mt-2">
          {/* Empty cells before 1st day */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[90px] rounded-xl bg-[#FAF7F2]/40 border border-dashed border-[#F0DFC2]/40"
            />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const record = daysData[dateKey];

            const isBlocked = record?.is_blocked || (record && record.available_count === 0);
            const isOverride = record?.is_override;
            const availableCount = record ? record.available_count : totalInventory;
            const displayPrice = record ? record.price : basePrice;
            const minStay = record?.minimum_stay;

            return (
              <div
                key={dateKey}
                onClick={() => handleDateClick(dateKey)}
                className={`min-h-[90px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:scale-[1.01] ${
                  isBlocked
                    ? "bg-slate-100/80 border-slate-300 opacity-80"
                    : isOverride
                    ? "bg-amber-50/40 border-amber-300"
                    : "bg-white border-[#F0DFC2] hover:border-[#1E88E5]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F2A2E]">{dayNum}</span>
                  {isBlocked ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      <Ban className="w-2.5 h-2.5" /> Blocked
                    </span>
                  ) : isOverride ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      <Sparkles className="w-2.5 h-2.5" /> Custom
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {availableCount} left
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <p
                    className={`text-xs font-bold ${
                      isOverride ? "text-amber-800" : "text-[#1F2A2E]"
                    }`}
                  >
                    ₱{displayPrice.toLocaleString()}
                  </p>
                  {minStay && (
                    <p className="text-[9px] font-medium text-[#64716F]">
                      Min {minStay}N
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal: Single Day Override ──────────────────────────────── */}
      {selectedDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  Edit Date Override
                </h3>
                <p className="text-xs text-[#64716F] font-mono mt-0.5">
                  {selectedDateKey} • {selectedRoomType?.name_en}
                </p>
              </div>
              <button
                onClick={() => setSelectedDateKey(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleDay} className="mt-4 space-y-4">
              {/* Block toggle */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F2A2E]">Block this date</p>
                  <p className="text-[10px] text-[#64716F]">
                    Prevents all instant bookings for this specific day
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={singleIsBlocked}
                  onChange={(e) => setSingleIsBlocked(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>

              {!singleIsBlocked && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      Available Units (Max {totalInventory})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalInventory}
                      value={singleAvailable}
                      onChange={(e) => setSingleAvailable(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      Nightly Rate Override (₱ PHP)
                    </label>
                    <input
                      type="number"
                      placeholder={`Default: ₱${basePrice.toLocaleString()}`}
                      value={singlePrice}
                      onChange={(e) => setSinglePrice(e.target.value)}
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      Minimum Stay (Nights)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 2 for weekend stay"
                      value={singleMinStay}
                      onChange={(e) => setSingleMinStay(e.target.value)}
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-[#F0DFC2]">
                <button
                  type="button"
                  onClick={handleResetSingleDay}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(null)}
                    className="px-3.5 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Override"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Bulk Update Dates ────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  Bulk Update Date Range
                </h3>
                <p className="text-xs text-[#64716F]">
                  Applying to: {selectedRoomType?.name_en}
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              {/* Block toggle */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F2A2E]">
                    Block all dates in range
                  </p>
                  <p className="text-[10px] text-[#64716F]">
                    Sets available units to 0 for the entire selected range
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={bulkIsBlocked}
                  onChange={(e) => setBulkIsBlocked(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>

              {!bulkIsBlocked && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                        Available Units
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={totalInventory}
                        value={bulkAvailable}
                        onChange={(e) => setBulkAvailable(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                        Price Override (₱ PHP)
                      </label>
                      <input
                        type="number"
                        placeholder={`Default: ₱${basePrice}`}
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                        className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      Minimum Stay (Nights)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 2 for peak holidays"
                      value={bulkMinStay}
                      onChange={(e) => setBulkMinStay(e.target.value)}
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F0DFC2]">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                >
                  {isPending ? "Applying..." : "Apply Range Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
