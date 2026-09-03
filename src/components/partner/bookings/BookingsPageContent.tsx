"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/src/lib/supabase/client";
import {
  BookingsMetricCards,
  BookingsMetricCardsSkeleton,
  BookingsToolbar,
  BookingsDataTable,
  BookingsDataTableSkeleton,
  BookingsPagination,
  type BookingsFilters,
} from "@/src/components/partner/bookings";
import type { PartnerBookingRow, PartnerBookingsStats } from "@/src/types/database.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingsPageContentProps {
  partnerId: string;
  initialStats: PartnerBookingsStats;
  initialBookings: PartnerBookingRow[];
  initialTotal: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingsPageContent({
  partnerId,
  initialStats,
  initialBookings,
  initialTotal,
}: BookingsPageContentProps) {
  const [stats, setStats] = useState<PartnerBookingsStats>(initialStats);
  const [bookings, setBookings] = useState<PartnerBookingRow[]>(initialBookings);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filters, setFilters] = useState<BookingsFilters>({
    search: "",
    status: "",
    listing: "",
    location: "",
    startDate: "",
    endDate: "",
    sortBy: "created_at_desc",
  });

  // ── Fetch bookings ────────────────────────────────────────────────────────────

  const fetchBookings = useCallback(
    async (pageNum: number, size: number, currentFilters: BookingsFilters) => {
      setLoading(true);
      try {
        const supabase = createClient();
        const offset = (pageNum - 1) * size;

        const { data, error } = await supabase.rpc("get_partner_bookings", {
          p_partner_id: partnerId,
          p_search: currentFilters.search || null,
          p_start_date: currentFilters.startDate || null,
          p_end_date: currentFilters.endDate || null,
          p_status: currentFilters.status || null,
          p_limit: size,
          p_offset: offset,
          p_sort_by: currentFilters.sortBy,
        });

        if (error) {
          console.error("Error fetching bookings:", error);
          return;
        }

        const rows = (data as PartnerBookingRow[]) ?? [];
        setBookings(rows);
        setTotalCount(rows.length > 0 ? rows[0].total_count : 0);
      } finally {
        setLoading(false);
      }
    },
    [partnerId]
  );

  // ── Fetch stats ───────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .rpc("get_partner_bookings_stats", { p_partner_id: partnerId })
        .single<PartnerBookingsStats>();

      if (data) setStats(data);
    } finally {
      setStatsLoading(false);
    }
  }, [partnerId]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleFilterChange = useCallback(
    (newFilters: BookingsFilters) => {
      setFilters(newFilters);
      setPage(1);
      fetchBookings(1, pageSize, newFilters);
      fetchStats();
    },
    [pageSize, fetchBookings, fetchStats]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchBookings(newPage, pageSize, filters);
    },
    [pageSize, filters, fetchBookings]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setPage(1);
      fetchBookings(1, newSize, filters);
    },
    [filters, fetchBookings]
  );

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      {statsLoading ? (
        <BookingsMetricCardsSkeleton />
      ) : (
        <BookingsMetricCards stats={stats} />
      )}

      {/* Toolbar */}
      <BookingsToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Data table */}
      {loading ? (
        <BookingsDataTableSkeleton />
      ) : (
        <BookingsDataTable bookings={bookings} />
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <BookingsPagination
          currentPage={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
