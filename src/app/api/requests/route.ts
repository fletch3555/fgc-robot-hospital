import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Request } from "@/models/Request";
import { User } from "@/models/User";
import { checkPermissions } from "@/lib/authz";

export async function GET() {
  try {
    const authz = await checkPermissions(['requests.view']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();
    
    const requests = await Request.findAll();

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error in GET /api/requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authz = await checkPermissions(['requests.create']);
  if (!authz.authorized) {
    return authz.response!;
  }

  try {
    const { session } = authz;

    const body = await req.json();
    const { countryCode, type, comments, hardwareData, softwareData, machineShopData, batteryChargingData } = body;

    if (!countryCode || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Get the user ID from the session
    const submittedById = session!.user.id;
    
    // Verify user exists
    const user = await User.findById(submittedById);
    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 400 });
    }

    const newRequest = await Request.create({
      countryCode,
      type,
      comments,
      priority: 'medium', // Default priority
      submittedBy: submittedById,
      hardwareData,
      softwareData,
      machineShopData,
      batteryChargingData,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}