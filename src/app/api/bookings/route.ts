import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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
        { success: false, error: bError.message, bookings: [] },
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

/**
 * POST /api/bookings
 * Creates an instant booking reservation with 30% downpayment calculation
 * Body: {
 *   propertyId: string,
 *   roomTypeId?: string,
 *   checkIn: string,
 *   checkOut: string,
 *   adults?: number,
 *   children?: number,
 *   specialRequests?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHENTICATED",
          message: "Please sign in or create an account to book your stay",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      propertyId,
      roomTypeId,
      checkIn,
      checkOut,
      adults = 1,
      children = 0,
      specialRequests = "",
    } = body;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Property identifier is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Resolve Property from DB
    let propertyQuery = adminClient.from("properties").select(`
      id,
      name,
      slug,
      downpayment_rate,
      address,
      area:areas(name_en),
      room_types(id, name_en, base_price, capacity)
    `);

    if (isUUID(propertyId)) {
      propertyQuery = propertyQuery.eq("id", propertyId);
    } else {
      propertyQuery = propertyQuery.or(`slug.eq.${propertyId},id.eq.${propertyId}`);
    }

    const { data: propData, error: propErr } = await propertyQuery.maybeSingle();

    if (propErr || !propData) {
      return NextResponse.json(
        { success: false, error: "Selected property could not be found" },
        { status: 404 }
      );
    }

    // 2. Resolve Room Type
    let selectedRoom = propData.room_types?.find(
      (r: any) => r.id === roomTypeId || (isUUID(roomTypeId || "") && r.id === roomTypeId)
    );

    if (!selectedRoom && propData.room_types && propData.room_types.length > 0) {
      selectedRoom = propData.room_types[0];
    }

    if (!selectedRoom) {
      return NextResponse.json(
        { success: false, error: "No room types available for this property" },
        { status: 400 }
      );
    }

    // 3. Calculate Dates and Pricing
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    const finalCheckIn = checkIn || todayStr;
    const finalCheckOut = checkOut || tomorrowStr;

    const startDate = new Date(finalCheckIn).getTime();
    const endDate = new Date(finalCheckOut).getTime();
    const diffNights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    const nightlyRate = Number(selectedRoom.base_price) || 3000;
    const subtotal = nightlyRate * diffNights;
    const downpaymentRate = Number(propData.downpayment_rate) || 0.3;
    const downpaymentAmount = Math.round(subtotal * downpaymentRate);
    const balanceDue = subtotal - downpaymentAmount;

    // 4. Insert into `bookings` table
    const holdExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: newBooking, error: bookingErr } = await adminClient
      .from("bookings")
      .insert({
        customer_id: user.id,
        room_type_id: selectedRoom.id,
        check_in: finalCheckIn,
        check_out: finalCheckOut,
        adults_count: adults,
        children_count: children,
        subtotal: subtotal,
        discount_amount: 0,
        total_amount: subtotal,
        downpayment_amount: downpaymentAmount,
        balance_due: balanceDue,
        status: "pending_payment",
        payment_status: "pending",
        hold_expires_at: holdExpiry,
      })
      .select()
      .single();

    if (bookingErr || !newBooking) {
      console.error("Booking creation error:", bookingErr);
      return NextResponse.json(
        { success: false, error: bookingErr?.message || "Failed to create booking" },
        { status: 500 }
      );
    }

    // 5. Insert Status History
    await adminClient.from("booking_status_history").insert({
      booking_id: newBooking.id,
      from_status: null,
      to_status: "pending_payment",
      changed_by: user.id,
      note: `Instant booking created. 30% downpayment hold (₱${downpaymentAmount.toLocaleString()}) active for 15 mins. ${specialRequests ? `Special Requests: ${specialRequests}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      message: `Reservation confirmed for ${propData.name}!`,
      booking: {
        id: newBooking.id,
        referenceNumber: `DIP-${newBooking.id.substring(0, 8).toUpperCase()}`,
        propertyName: propData.name,
        roomName: selectedRoom.name_en,
        areaName:
          (Array.isArray(propData.area)
            ? (propData.area[0] as any)?.name_en
            : (propData.area as any)?.name_en) || "Quezon",
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        nights: diffNights,
        adults,
        children,
        nightlyRate,
        totalAmount: subtotal,
        downpaymentAmount,
        balanceDue,
        status: newBooking.status,
        holdExpiresAt: holdExpiry,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in POST /api/bookings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
