"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/src/actions/partner/update-property";

const propertySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description_en: z.string().min(10, "English description is required"),
  description_fil: z.string().min(10, "Filipino description is required"),
  address: z.string().min(5, "Address is required"),
});

type PropertyInput = z.infer<typeof propertySchema>;

export function PropertyForm({ initialData, partnerId }: { initialData?: any; partnerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: initialData?.name || "",
      description_en: initialData?.description_en || "",
      description_fil: initialData?.description_fil || "",
      address: initialData?.address || "",
    },
  });

  async function onSubmit(data: PropertyInput) {
    console.log("onSubmit triggered with data:", data);
    setLoading(true);
    setError(null);
    const result = await updateProperty(partnerId, data);
    console.log("updateProperty result:", result);
    
    if (!result.success) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    
    router.refresh();
    setLoading(false);
  }

  function onError(errors: any) {
    console.error("Form validation errors:", errors);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium">Property Name</label>
        <input {...form.register("name")} className="w-full border rounded-lg p-2" />
        {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Description (EN)</label>
        <textarea {...form.register("description_en")} className="w-full border rounded-lg p-2" rows={3} />
        {form.formState.errors.description_en && <p className="text-red-500 text-xs">{form.formState.errors.description_en.message}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium">Description (FIL)</label>
        <textarea {...form.register("description_fil")} className="w-full border rounded-lg p-2" rows={3} />
        {form.formState.errors.description_fil && <p className="text-red-500 text-xs">{form.formState.errors.description_fil.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Address</label>
        <input {...form.register("address")} className="w-full border rounded-lg p-2" />
        {form.formState.errors.address && <p className="text-red-500 text-xs">{form.formState.errors.address.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-[#0E7C7B] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Property"}
      </button>
    </form>
  );
}
