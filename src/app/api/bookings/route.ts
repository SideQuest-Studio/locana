import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { mapDbError } from "@/src/lib/api/db-errors";
import { z } from "zod";

/**
 * GET /api/bookings
 * Returns the customer's active and past bookings
 */
export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", bookings: [] },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { data: dbBookings, error: bError } = await adminClient
      .from("bookings")
      .select(`
        id,
        check_in,
        check_out,
        adults_count,
        children_count,
        subtotal,
        total_amount,
        downpayment_amount,
        balance_due,
        status,
        payment_status,
        created_at,
        room_type:room_types(
          id,
          name_en,
          base_price,
          capacity,
          property:properties(
            id,
            name,
            slug,
            address,
            property_type,
            area:areas(name_en),
            images:property_images(image_url, is_cover)
          )
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (bError) {
      console.error("Error fetching bookings:", bError);
      return NextResponse.json(
        { success: false, error: "bookings.fetch_failed", bookings: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: dbBookings?.length || 0,
      bookings: dbBookings || [],
    });
  } catch (error: any) {
    console.error("Unexpected error in GET /api/bookings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

const bookingBodySchema = z.object({
  roomTypeId: z.string().uuid(),
  ratePlanId: z.string().uuid().nullish(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(20).default(0),
  specialRequests: z.string().max(1000).optional(),
});

/**
 * POST /api/bookings
 * Creates an instant booking through the create_booking RPC, which prices the stay server-side,
 * checks partner availability and holds the room for the 30% downpayment.
 * Body: { roomTypeId, ratePlanId?, checkIn, checkOut, adults?, children?, specialRequests? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHENTICATED",
          message: "Please sign in or create an account to book your stay",
        },
        { status: 401 }
      );
    }

    const parsed = bookingBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "validation.failed", message: "Please choose a room and valid dates." },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const { data, error } = await supabase.rpc("create_booking", {
      p_room_type_id: body.roomTypeId,
      p_rate_plan_id: body.ratePlanId ?? null,
      p_check_in: body.checkIn,
      p_check_out: body.checkOut,
      p_adults: body.adults,
      p_children: body.children,
      p_special_requests: body.specialRequests ?? null,
    });

    if (error || !data) {
      const mapped = mapDbError(error, "booking.create_failed");
      const unexpected = mapped.code === "booking.create_failed";
      if (unexpected) console.error("create_booking failed:", error);
      const status = mapped.code === "booking.sold_out" ? 409 : unexpected ? 500 : 400;
      return NextResponse.json({ success: false, error: mapped.code, message: mapped.message }, { status });
    }

    const { data: roomType } = await supabase
      .from("room_types")
      .select("name_en, property:properties(name, area:areas(name_en))")
      .eq("id", body.roomTypeId)
      .single();
    const property = Array.isArray(roomType?.property) ? roomType.property[0] : roomType?.property;
    const area = Array.isArray(property?.area) ? property.area[0] : property?.area;
    const nights = Number(data.nights);

    return NextResponse.json({
      success: true,
      message: `Reservation held for ${property?.name ?? "your stay"}`,
      booking: {
        id: data.booking_id,
        referenceNumber: data.reference,
        propertyName: property?.name ?? "",
        roomName: roomType?.name_en ?? "",
        areaName: area?.name_en ?? "Quezon",
        checkIn: data.check_in,
        checkOut: data.check_out,
        nights,
        adults: body.adults,
        children: body.children,
        nightlyRate: Math.round((Number(data.subtotal) / nights) * 100) / 100,
        totalAmount: Number(data.total),
        downpaymentAmount: Number(data.downpayment),
        balanceDue: Number(data.balance),
        status: data.status,
        holdExpiresAt: data.hold_expires_at,
      },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/bookings:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
