"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

const roomTypeSchema = z.object({
  name_en: z.string().min(2, "Name is required"),
  base_price: z.coerce.number().min(1, "Price must be at least 1"),
  capacity: z.coerce.number().min(1, "Capacity is required"),
  total_inventory: z.coerce.number().min(1, "Inventory is required"),
});

type RoomTypeInput = z.infer<typeof roomTypeSchema>;

export function RoomTypeForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RoomTypeInput>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name_en: "",
      base_price: 0,
      capacity: 1,
      total_inventory: 1,
    },
  });

  async function onSubmit(data: RoomTypeInput) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("room_types").insert({
      property_id: propertyId,
      ...data,
    });
    
    if (error) {
      setError("Failed to create room type: " + error.message);
    } else {
      router.refresh();
      form.reset();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium">Room Name</label>
        <input {...form.register("name_en")} className="w-full border rounded-lg p-2" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Base Price</label>
          <input type="number" {...form.register("base_price")} className="w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Capacity</label>
          <input type="number" {...form.register("capacity")} className="w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Inventory</label>
          <input type="number" {...form.register("total_inventory")} className="w-full border rounded-lg p-2" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-[#0E7C7B] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Room Type"}
      </button>
    </form>
  );
}
