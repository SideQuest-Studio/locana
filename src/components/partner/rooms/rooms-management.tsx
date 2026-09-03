"use client";

import React, { useState, useTransition } from "react";
import {
  BedDouble,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Wrench,
  Sparkles,
  Maximize2,
  Check,
  ChevronDown,
} from "lucide-react";
import type { RoomType, Room, RoomStatus } from "@/src/types/database.types";
import {
  createRoomType,
  updateRoomType,
  deleteRoomType,
  addRoomUnit,
  updateRoomUnitStatus,
  deleteRoomUnit,
  batchCreateRoomUnits,
  type RoomTypeInput,
} from "@/src/actions/partner/rooms";

export type RoomTypeWithUnits = RoomType & {
  rooms: Room[];
};

interface RoomsManagementProps {
  propertyId: string;
  roomTypes: RoomTypeWithUnits[];
}

export function RoomsManagement({ propertyId, roomTypes }: RoomsManagementProps) {
  const [typesList, setTypesList] = useState<RoomTypeWithUnits[]>(roomTypes);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomTypeWithUnits | null>(null);

  // Batch unit modal state
  const [batchModalRoomTypeId, setBatchModalRoomTypeId] = useState<string | null>(null);
  const [batchPrefix, setBatchPrefix] = useState("Room");
  const [batchStart, setBatchStart] = useState(101);
  const [batchCount, setBatchCount] = useState(5);
  const [batchFloor, setBatchFloor] = useState("1st Floor");

  // Single unit inline state
  const [singleUnitRoomTypeId, setSingleUnitRoomTypeId] = useState<string | null>(null);
  const [singleUnitNumber, setSingleUnitNumber] = useState("");
  const [singleUnitFloor, setSingleUnitFloor] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state for Room Type Modal
  const [typeForm, setTypeForm] = useState<RoomTypeInput>({
    name_en: "",
    name_fil: "",
    description_en: "",
    description_fil: "",
    capacity: 2,
    max_adults: 2,
    max_children: 0,
    base_price: 2500,
    total_inventory: 5,
    size_sqm: 30,
    bed_configuration: "1 King Bed",
  });

  // Calculate KPIs
  const totalRoomTypes = typesList.length;
  const allUnits = typesList.flatMap((t) => t.rooms || []);
  const totalUnits = allUnits.length;
  const availableUnits = allUnits.filter((u) => u.status === "available").length;
  const occupiedUnits = allUnits.filter((u) => u.status === "occupied").length;
  const maintenanceUnits = allUnits.filter((u) => u.status === "maintenance").length;

  const openCreateModal = () => {
    setEditingType(null);
    setTypeForm({
      name_en: "",
      name_fil: "",
      description_en: "",
      description_fil: "",
      capacity: 2,
      max_adults: 2,
      max_children: 0,
      base_price: 2500,
      total_inventory: 5,
      size_sqm: 30,
      bed_configuration: "1 King Bed",
    });
    setErrorMessage(null);
    setIsTypeModalOpen(true);
  };

  const openEditModal = (rt: RoomTypeWithUnits) => {
    setEditingType(rt);
    setTypeForm({
      name_en: rt.name_en,
      name_fil: rt.name_fil || "",
      description_en: rt.description_en || "",
      description_fil: rt.description_fil || "",
      capacity: rt.capacity,
      max_adults: rt.max_adults,
      max_children: rt.max_children,
      base_price: rt.base_price,
      total_inventory: rt.total_inventory,
      size_sqm: rt.size_sqm || undefined,
      bed_configuration: rt.bed_configuration || "",
    });
    setErrorMessage(null);
    setIsTypeModalOpen(true);
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      if (editingType) {
        const res = await updateRoomType(editingType.id, propertyId, typeForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          setTypesList((prev) =>
            prev.map((t) =>
              t.id === editingType.id
                ? {
                    ...t,
                    ...typeForm,
                    name_fil: typeForm.name_fil || null,
                    description_en: typeForm.description_en || null,
                    description_fil: typeForm.description_fil || null,
                    size_sqm: typeForm.size_sqm || null,
                    bed_configuration: typeForm.bed_configuration || null,
                  }
                : t
            )
          );
          setSuccessMessage("Room type updated successfully!");
          setIsTypeModalOpen(false);
        }
      } else {
        const res = await createRoomType(propertyId, typeForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          const newRoomType: RoomTypeWithUnits = {
            id: res.data.id,
            property_id: propertyId,
            name_en: typeForm.name_en,
            name_fil: typeForm.name_fil || null,
            description_en: typeForm.description_en || null,
            description_fil: typeForm.description_fil || null,
            capacity: typeForm.capacity,
            max_adults: typeForm.max_adults,
            max_children: typeForm.max_children,
            base_price: typeForm.base_price,
            total_inventory: typeForm.total_inventory,
            size_sqm: typeForm.size_sqm || null,
            bed_configuration: typeForm.bed_configuration || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rooms: [],
          };
          setTypesList((prev) => [newRoomType, ...prev]);
          setSuccessMessage("New room type created successfully!");
          setIsTypeModalOpen(false);
        }
      }
    });
  };

  const handleDeleteRoomType = (roomTypeId: string) => {
    if (!confirm("Are you sure you want to delete this room type and all its units?")) return;

    startTransition(async () => {
      const res = await deleteRoomType(roomTypeId, propertyId);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setTypesList((prev) => prev.filter((t) => t.id !== roomTypeId));
      }
    });
  };

  const handleAddSingleUnit = (roomTypeId: string) => {
    if (!singleUnitNumber.trim()) return;

    startTransition(async () => {
      const res = await addRoomUnit(roomTypeId, {
        room_number: singleUnitNumber.trim(),
        floor: singleUnitFloor.trim() || undefined,
        status: "available",
      });

      if (!res.success) {
        alert(res.error.message);
      } else {
        const newUnit: Room = {
          id: res.data.id,
          room_type_id: roomTypeId,
          room_number: singleUnitNumber.trim(),
          floor: singleUnitFloor.trim() || null,
          notes: null,
          status: "available",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTypesList((prev) =>
          prev.map((t) =>
            t.id === roomTypeId
              ? { ...t, rooms: [...(t.rooms || []), newUnit] }
              : t
          )
        );
        setSingleUnitNumber("");
        setSingleUnitFloor("");
        setSingleUnitRoomTypeId(null);
      }
    });
  };

  const handleBatchGenerate = (roomTypeId: string) => {
    startTransition(async () => {
      const res = await batchCreateRoomUnits(
        roomTypeId,
        batchPrefix,
        Number(batchStart),
        Number(batchCount),
        batchFloor
      );

      if (!res.success) {
        alert(res.error.message);
      } else {
        // Create local optimistic units
        const newUnits: Room[] = [];
        for (let i = 0; i < batchCount; i++) {
          const num = Number(batchStart) + i;
          const roomNum = batchPrefix ? `${batchPrefix.trim()} ${num}` : `${num}`;
          newUnits.push({
            id: `temp-${Date.now()}-${i}`,
            room_type_id: roomTypeId,
            room_number: roomNum,
            floor: batchFloor || null,
            notes: null,
            status: "available",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        setTypesList((prev) =>
          prev.map((t) =>
            t.id === roomTypeId
              ? { ...t, rooms: [...(t.rooms || []), ...newUnits] }
              : t
          )
        );
        setBatchModalRoomTypeId(null);
      }
    });
  };

  const handleUnitStatusToggle = (
    roomTypeId: string,
    unitId: string,
    newStatus: RoomStatus
  ) => {
    startTransition(async () => {
      const res = await updateRoomUnitStatus(unitId, newStatus);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setTypesList((prev) =>
          prev.map((t) =>
            t.id === roomTypeId
              ? {
                  ...t,
                  rooms: t.rooms.map((r) =>
                    r.id === unitId ? { ...r, status: newStatus } : r
                  ),
                }
              : t
          )
        );
      }
    });
  };

  const handleDeleteUnit = (roomTypeId: string, unitId: string) => {
    if (!confirm("Are you sure you want to remove this unit?")) return;

    startTransition(async () => {
      const res = await deleteRoomUnit(unitId);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setTypesList((prev) =>
          prev.map((t) =>
            t.id === roomTypeId
              ? { ...t, rooms: t.rooms.filter((r) => r.id !== unitId) }
              : t
          )
        );
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A2E]">
            Room Types & Individual Units
          </h1>
          <p className="text-sm text-[#64716F] mt-1">
            Define your room categories, pricing, capacities, and physical unit numbers (e.g. Room 101, Villa A).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-sm font-semibold hover:bg-[#1976D2] shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Room Type
        </button>
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

      {/* ── KPI Overview Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64716F]">
            <span className="text-xs font-bold uppercase tracking-wider">Room Types</span>
            <BedDouble className="w-4 h-4 text-[#1E88E5]" />
          </div>
          <p className="text-2xl font-bold text-[#1F2A2E] mt-2">{totalRoomTypes}</p>
          <p className="text-[11px] text-[#64716F] mt-0.5">Active categories</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64716F]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Units</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-[#1F2A2E] mt-2">{totalUnits}</p>
          <p className="text-[11px] text-[#64716F] mt-0.5">Configured rooms</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{availableUnits}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Ready for instant book</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Occupied / Maint</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 mt-2">
            {occupiedUnits + maintenanceUnits}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {occupiedUnits} occupied, {maintenanceUnits} maintenance
          </p>
        </div>
      </div>

      {/* ── Room Types & Units List ─────────────────────────────────── */}
      {typesList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
          <BedDouble className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1F2A2E]">No room types created yet</h3>
          <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
            Create your first room type (e.g. Deluxe Room, Villa, Suite) to begin accepting bookings.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
          >
            <Plus className="w-4 h-4" /> Create Room Type
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {typesList.map((rt) => {
            const unitCount = rt.rooms?.length || 0;
            const isSingleAddOpen = singleUnitRoomTypeId === rt.id;

            return (
              <div
                key={rt.id}
                className="rounded-2xl border border-[#F0DFC2] bg-white p-6 shadow-sm space-y-5 hover:border-[#1E88E5]/40 transition-all"
              >
                {/* Header & Meta */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0DFC2]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-[#1F2A2E]">{rt.name_en}</h2>
                      {rt.name_fil && (
                        <span className="text-xs text-[#64716F] font-medium italic">
                          ({rt.name_fil})
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1E88E5]">
                        {rt.total_inventory} Units Capacity
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#64716F] mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Up to {rt.capacity} Guests ({rt.max_adults} Adults, {rt.max_children} Kids)
                      </span>
                      {rt.bed_configuration && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                          {rt.bed_configuration}
                        </span>
                      )}
                      {rt.size_sqm && (
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                          {rt.size_sqm} sqm
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-[#64716F]">Base Rate</p>
                      <p className="text-xl font-bold text-[#1F2A2E]">
                        ₱{Number(rt.base_price).toLocaleString()}
                        <span className="text-xs font-normal text-[#64716F]">/night</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-[#F0DFC2] pl-4">
                      <button
                        onClick={() => openEditModal(rt)}
                        className="p-2 rounded-xl border border-[#F0DFC2] text-slate-600 hover:text-[#1E88E5] hover:bg-blue-50 transition-colors"
                        title="Edit room type"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoomType(rt.id)}
                        className="p-2 rounded-xl border border-[#F0DFC2] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete room type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Individual Units Section */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#1F2A2E] uppercase tracking-wider">
                        Assigned Physical Units ({unitCount})
                      </h4>
                      <span className="text-[11px] text-[#64716F]">
                        (Click a status badge to toggle Available/Maintenance)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSingleUnitRoomTypeId(isSingleAddOpen ? null : rt.id)
                        }
                        className="text-xs font-semibold text-[#1E88E5] hover:text-[#1565C0] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isSingleAddOpen ? "Cancel" : "Add Unit"}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => {
                          setBatchModalRoomTypeId(rt.id);
                          setBatchPrefix(rt.name_en.split(" ")[0] || "Room");
                        }}
                        className="text-xs font-semibold text-[#64716F] hover:text-[#1F2A2E] flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Batch Generate
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Single Unit Form */}
                  {isSingleAddOpen && (
                    <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2] mb-3 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Unit Number / Name (e.g. 101, Villa A)"
                        value={singleUnitNumber}
                        onChange={(e) => setSingleUnitNumber(e.target.value)}
                        className="w-full sm:w-1/2 rounded-lg border border-[#F0DFC2] bg-white px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                      />
                      <input
                        type="text"
                        placeholder="Floor / Wing (optional)"
                        value={singleUnitFloor}
                        onChange={(e) => setSingleUnitFloor(e.target.value)}
                        className="w-full sm:w-1/3 rounded-lg border border-[#F0DFC2] bg-white px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                      />
                      <button
                        onClick={() => handleAddSingleUnit(rt.id)}
                        disabled={isPending || !singleUnitNumber.trim()}
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Units Pills Grid */}
                  {unitCount === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No physical room units created yet. Add individual units or click Batch Generate to create units automatically.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {rt.rooms.map((unit) => (
                        <div
                          key={unit.id}
                          className="group relative p-2.5 rounded-xl border border-[#F0DFC2] bg-white hover:border-[#1E88E5]/50 transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-bold text-xs text-[#1F2A2E] truncate">
                              {unit.room_number}
                            </span>
                            <button
                              onClick={() => handleDeleteUnit(rt.id, unit.id)}
                              className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete unit"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {unit.floor && (
                            <p className="text-[10px] text-[#64716F] mb-1.5 truncate">
                              {unit.floor}
                            </p>
                          )}

                          {/* Quick Status Toggle Dropdown */}
                          <div className="relative">
                            <select
                              value={unit.status}
                              onChange={(e) =>
                                handleUnitStatusToggle(
                                  rt.id,
                                  unit.id,
                                  e.target.value as RoomStatus
                                )
                              }
                              className={`w-full text-[10px] font-bold uppercase rounded-md py-1 px-1.5 border-none focus:outline-none cursor-pointer ${
                                unit.status === "available"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : unit.status === "occupied"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              <option value="available">Available</option>
                              <option value="occupied">Occupied</option>
                              <option value="maintenance">Maintenance</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Create / Edit Room Type ──────────────────────────── */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BedDouble className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  {editingType ? "Edit Room Type" : "Create New Room Type"}
                </h3>
              </div>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTypeSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Room Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deluxe Garden Villa"
                    value={typeForm.name_en}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, name_en: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Room Name (FIL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deluxe Hardin Villa"
                    value={typeForm.name_fil || ""}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, name_fil: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Base Rate (₱/night) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={typeForm.base_price}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        base_price: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Total Inventory *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={typeForm.total_inventory}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        total_inventory: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Size (sqm)
                  </label>
                  <input
                    type="number"
                    value={typeForm.size_sqm || ""}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        size_sqm: Number(e.target.value) || undefined,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={typeForm.capacity}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Max Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={typeForm.max_adults}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        max_adults: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Max Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={typeForm.max_children}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        max_children: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  Bed Configuration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 King Bed or 2 Queen Beds"
                  value={typeForm.bed_configuration || ""}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, bed_configuration: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              {/* Bilingual Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Description (EN)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe room features, view, and furnishings in English..."
                    value={typeForm.description_en || ""}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, description_en: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] p-2.5 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Description (FIL)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ilarawan ang mga gamit, tanawin, at pasilidad sa kuwarto sa Filipino..."
                    value={typeForm.description_fil || ""}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, description_fil: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] p-2.5 text-xs focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50 transition-all"
                >
                  {isPending ? "Saving..." : editingType ? "Update Room Type" : "Create Room Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Batch Generate Units ─────────────────────────────── */}
      {batchModalRoomTypeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  Batch Generate Units
                </h3>
              </div>
              <button
                onClick={() => setBatchModalRoomTypeId(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-[#64716F]">
                Quickly generate numbered physical room units (e.g., Room 101 through Room 105).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="e.g. Room or Villa"
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Starting Number
                  </label>
                  <input
                    type="number"
                    value={batchStart}
                    onChange={(e) => setBatchStart(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Quantity to Generate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Floor / Wing
                  </label>
                  <input
                    type="text"
                    value={batchFloor}
                    onChange={(e) => setBatchFloor(e.target.value)}
                    placeholder="e.g. 1st Floor"
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <span className="font-bold">Preview: </span>
                <span>
                  {batchPrefix} {batchStart}, {batchPrefix} {batchStart + 1} …{" "}
                  {batchPrefix} {batchStart + batchCount - 1}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalRoomTypeId(null)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchGenerate(batchModalRoomTypeId)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                >
                  {isPending ? "Generating..." : `Generate ${batchCount} Units`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
