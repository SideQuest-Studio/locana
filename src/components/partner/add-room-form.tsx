"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addRoom } from "@/src/actions/partner/add-room";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const roomSchema = z.object({
  room_number: z.string().min(1, "Room number is required"),
  floor: z.string().optional(),
});

export function AddRoomForm({ roomTypeId }: { roomTypeId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: { room_number: "", floor: "" },
  });

  async function onSubmit(data: z.infer<typeof roomSchema>) {
    setLoading(true);
    
    try {
      const result = await addRoom({ room_type_id: roomTypeId, ...data });
      
      if (!result.success) {
        toast.error("Failed to add room", { description: result.error.message });
        setLoading(false);
        return;
      }
      
      toast.success("Room added successfully");
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 mt-2">
      <input {...form.register("room_number")} placeholder="Room #" className="border rounded px-2 py-1 text-sm" />
      <input {...form.register("floor")} placeholder="Floor" className="border rounded px-2 py-1 text-sm" />
      <button type="submit" disabled={loading} className="bg-[#0E7C7B] text-white px-3 py-1 rounded text-sm disabled:opacity-50">
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
