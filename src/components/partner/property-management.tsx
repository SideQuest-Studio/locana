"use client";

import React, { useState, useTransition, useRef } from "react";
import {
  Building2,
  MapPin,
  Clock,
  Coins,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Save,
  Compass,
} from "lucide-react";
import type { Area, Amenity, AmenityCategory } from "@/src/types/property.types";
import {
  savePropertyDetails,
  uploadPropertyImage,
  deletePropertyImage,
  setCoverPropertyImage,
  type PropertyDetailsInput,
} from "@/src/actions/partner/property";

export interface PropertyImageItem {
  id: string;
  property_id: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
  alt_text?: string | null;
}

export interface PartnerPropertyData {
  id?: string;
  partner_id: string;
  name: string;
  slug?: string;
  property_type: "resort" | "hotel" | "homestay" | "glamping" | "villa";
  area_id: string;
  description_en: string;
  description_fil: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  check_in_time: string;
  check_out_time: string;
  early_checkin_fee: number;
  late_checkout_fee: number;
  downpayment_rate: number;
  status?: string;
  amenity_ids: string[];
  images: PropertyImageItem[];
}

interface PropertyManagementProps {
  partnerId: string;
  initialProperty: PartnerPropertyData;
  areas: Area[];
  amenitiesByCategory: {
    category: AmenityCategory;
    amenities: Amenity[];
  }[];
}

export function PropertyManagement({
  partnerId,
  initialProperty,
  areas,
  amenitiesByCategory,
}: PropertyManagementProps) {
  const [activeTab, setActiveTab] = useState<"details" | "policies" | "amenities" | "photos">("details");
  const [formData, setFormData] = useState<PartnerPropertyData>(initialProperty);
  const [images, setImages] = useState<PropertyImageItem[]>(initialProperty.images || []);
  const [savedPropertyId, setSavedPropertyId] = useState<string | undefined>(initialProperty.id);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Photo upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "early_checkin_fee" || name === "late_checkout_fee" || name === "downpayment_rate"
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => {
      const exists = prev.amenity_ids.includes(amenityId);
      return {
        ...prev,
        amenity_ids: exists
          ? prev.amenity_ids.filter((id) => id !== amenityId)
          : [...prev.amenity_ids, amenityId],
      };
    });
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: PropertyDetailsInput = {
      name: formData.name,
      property_type: formData.property_type,
      area_id: formData.area_id,
      description_en: formData.description_en,
      description_fil: formData.description_fil,
      address: formData.address,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      check_in_time: formData.check_in_time || "14:00",
      check_out_time: formData.check_out_time || "12:00",
      early_checkin_fee: Number(formData.early_checkin_fee) || 0,
      late_checkout_fee: Number(formData.late_checkout_fee) || 0,
      downpayment_rate: Number(formData.downpayment_rate) || 0.3,
      amenity_ids: formData.amenity_ids,
    };

    startTransition(async () => {
      const res = await savePropertyDetails(partnerId, payload);
      if (!res.success) {
        setErrorMessage(res.error.message);
      } else {
        setSavedPropertyId(res.data.propertyId);
        setSuccessMessage("Property details updated and synchronized successfully!");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const propertyIdToUse = savedPropertyId || formData.id;
    if (!propertyIdToUse) {
      setPhotoError("Please save property details first before uploading gallery photos.");
      return;
    }

    setPhotoError(null);
    setUploadingPhoto(true);

    const data = new FormData();
    data.append("image", file);

    const res = await uploadPropertyImage(propertyIdToUse, partnerId, data);
    setUploadingPhoto(false);

    if (!res.success) {
      setPhotoError(res.error.message);
    } else {
      const isFirst = images.length === 0;
      const newImg: PropertyImageItem = {
        id: res.data.id,
        property_id: propertyIdToUse,
        image_url: res.data.imageUrl,
        is_cover: isFirst,
        display_order: images.length + 1,
      };
      setImages((prev) => [...prev, newImg]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (imageId: string) => {
    const propertyIdToUse = savedPropertyId || formData.id;
    if (!propertyIdToUse || !confirm("Are you sure you want to remove this photo?")) return;

    startTransition(async () => {
      const res = await deletePropertyImage(imageId, propertyIdToUse);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    });
  };

  const handleSetCover = async (imageId: string) => {
    const propertyIdToUse = savedPropertyId || formData.id;
    if (!propertyIdToUse) return;

    startTransition(async () => {
      const res = await setCoverPropertyImage(imageId, propertyIdToUse);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_cover: img.id === imageId,
          }))
        );
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A2E]">Property & Listing Management</h1>
          <p className="text-sm text-[#64716F] mt-1">
            Configure your property information, Quezon location, policies, amenities, and photo gallery.
          </p>
        </div>
        <button
          onClick={handleSaveDetails}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E88E5] text-white text-sm font-semibold hover:bg-[#1976D2] shadow-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving changes..." : "Save Listing"}
        </button>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-[#F0DFC2] pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "details"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <Building2 className="w-4 h-4" />
          General & Location
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "policies"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <Clock className="w-4 h-4" />
          Policies & Pricing Rules
        </button>

        <button
          onClick={() => setActiveTab("amenities")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "amenities"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Amenities ({formData.amenity_ids.length})
        </button>

        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "photos"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Photo Gallery ({images.length})
        </button>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 shadow-sm">
        {/* TAB 1: General & Location */}
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Property Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleTextChange}
                  placeholder="e.g. Villa Escudero Resort"
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Property Category *
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none capitalize"
                >
                  <option value="resort">Resort</option>
                  <option value="hotel">Hotel</option>
                  <option value="villa">Private Villa</option>
                  <option value="glamping">Glamping & Eco-Camp</option>
                  <option value="homestay">Homestay</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Quezon Municipality (Area) *
                </label>
                <select
                  name="area_id"
                  value={formData.area_id}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                  required
                >
                  <option value="">Select Municipality</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.province})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Complete Physical Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleTextChange}
                  placeholder="e.g. Barangay San Antonio, Lucban, Quezon"
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Bilingual Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  English Description (EN) *
                </label>
                <textarea
                  name="description_en"
                  rows={4}
                  value={formData.description_en}
                  onChange={handleTextChange}
                  placeholder="Describe your resort, natural ambiance, amenities, and guest experience in English..."
                  className="w-full rounded-xl border border-[#F0DFC2] p-3 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Filipino Description (FIL) *
                </label>
                <textarea
                  name="description_fil"
                  rows={4}
                  value={formData.description_fil}
                  onChange={handleTextChange}
                  placeholder="Ilarawan ang inyong resort, kapaligiran, at mga pasilidad sa wikang Filipino..."
                  className="w-full rounded-xl border border-[#F0DFC2] p-3 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2] space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#1E88E5]" />
                <h3 className="text-xs font-bold text-[#1F2A2E]">
                  Map Coordinates (Optional)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64716F] mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude ?? ""}
                    onChange={handleTextChange}
                    placeholder="e.g. 13.9314"
                    className="w-full rounded-lg border border-[#F0DFC2] bg-white px-3 py-2 text-xs text-[#1F2A2E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64716F] mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude ?? ""}
                    onChange={handleTextChange}
                    placeholder="e.g. 121.6172"
                    className="w-full rounded-lg border border-[#F0DFC2] bg-white px-3 py-2 text-xs text-[#1F2A2E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Operational Policies & Pricing Rules */}
        {activeTab === "policies" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Standard Check-in Time
                </label>
                <input
                  type="time"
                  name="check_in_time"
                  value={formData.check_in_time}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Standard Check-out Time
                </label>
                <input
                  type="time"
                  name="check_out_time"
                  value={formData.check_out_time}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Early Check-in Fee (₱ PHP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  name="early_checkin_fee"
                  value={formData.early_checkin_fee}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Late Check-out Fee (₱ PHP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  name="late_checkout_fee"
                  value={formData.late_checkout_fee}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Required Downpayment Rate (%)
                </label>
                <select
                  name="downpayment_rate"
                  value={formData.downpayment_rate}
                  onChange={handleTextChange}
                  className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                >
                  <option value={0.2}>20% Downpayment</option>
                  <option value={0.3}>30% Downpayment (Default)</option>
                  <option value={0.5}>50% Downpayment</option>
                  <option value={1.0}>100% Full Payment</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-800 space-y-1">
              <p className="font-bold">Instant Booking Payment Policy (PayMongo)</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Guests will be required to pay the specified downpayment percentage upon instant booking.
                The remaining balance will be due directly upon physical check-in at the property.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Amenities Selection */}
        {activeTab === "amenities" && (
          <div className="space-y-6">
            <p className="text-xs text-[#64716F]">
              Select all amenities, recreational facilities, and services available at your property.
            </p>

            {amenitiesByCategory.map(({ category, amenities }) => (
              <div key={category.id} className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1F2A2E] uppercase tracking-wider">
                  {category.name_en}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {amenities.map((amenity) => {
                    const isSelected = formData.amenity_ids.includes(amenity.id);
                    return (
                      <button
                        type="button"
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-[#1E88E5] bg-blue-50/50 text-[#1E88E5] shadow-sm"
                            : "border-[#F0DFC2] bg-white text-[#64716F] hover:border-[#1E88E5]/40 hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-[#1E88E5] border-[#1E88E5] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className="truncate">{amenity.name_en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: Photo Gallery */}
        {activeTab === "photos" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F2A2E]">Property Photo Gallery</h3>
                <p className="text-xs text-[#64716F] mt-0.5">
                  High quality photos increase instant bookings by up to 80%.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50 transition-all shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploadingPhoto ? "Uploading photo..." : "Add Photo"}
                </button>
              </div>
            </div>

            {photoError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{photoError}</span>
              </div>
            )}

            {images.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-[#FAF7F2]/60 p-12 text-center cursor-pointer hover:bg-[#FAF7F2] transition-colors"
              >
                <ImageIcon className="w-10 h-10 text-[#64716F]/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#1F2A2E]">No photos uploaded yet</p>
                <p className="text-[11px] text-[#64716F] mt-1">
                  Click to upload high-resolution photos of your property and surroundings.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`group relative rounded-2xl overflow-hidden border transition-all shadow-sm ${
                      img.is_cover
                        ? "border-[#1E88E5] ring-2 ring-[#1E88E5]/20"
                        : "border-[#F0DFC2]"
                    }`}
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 relative">
                      <img
                        src={img.image_url}
                        alt="Property photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {img.is_cover && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#1E88E5] text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-current" /> Cover Photo
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-[#F0DFC2]">
                      {!img.is_cover ? (
                        <button
                          type="button"
                          onClick={() => handleSetCover(img.id)}
                          className="text-[11px] font-semibold text-[#1E88E5] hover:text-[#1565C0]"
                        >
                          Set as Cover
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Hero Image
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(img.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
