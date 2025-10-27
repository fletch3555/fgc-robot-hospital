import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Request } from "@/models/Request";
import { User } from "@/models/User";
import { checkPermissions } from "@/lib/authz";

export async function GET() {
  try {
    const authz = await checkPermissions(['requests.view', 'hardware.view', 'software.view', 'machine_shop.view'], false);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();
    
    // Fetch active requests (open and in-progress)
    const activeRequests = (await Request.findAll()).filter(request => {
      // Filter requests based on type and user permissions
      if (request.type === 'hardware')
        return authz.permissions?.includes('hardware.view');
      if (request.type === 'software')
        return authz.permissions?.includes('software.view');
      if (request.type === 'machine_shop')
        return authz.permissions?.includes('machine_shop.view');
      if (request.type === 'battery_charging')
        return authz.permissions?.includes('requests.view');

      return false;
    });

    // Fetch recently closed requests (last 10)
    const closedRequests = (await Request.findRecentlyClosed(10)).filter(request => {
      // Filter requests based on type and user permissions
      if (request.type === 'hardware')
        return authz.permissions?.includes('hardware.view');
      if (request.type === 'software')
        return authz.permissions?.includes('software.view');
      if (request.type === 'machine_shop')
        return authz.permissions?.includes('machine_shop.view');
      if (request.type === 'battery_charging')
        return authz.permissions?.includes('requests.view');

      return false;
    });

    return NextResponse.json({
      active: activeRequests,
      closed: closedRequests
    });
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
    const { countryCode, type, comments, assignedTo, hardwareData, softwareData, machineShopData, batteryChargingData } = body;

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

    // Verify assigned user exists if provided
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return NextResponse.json({ error: "Assigned user not found" }, { status: 400 });
      }
    }

    const newRequest = await Request.create({
      countryCode,
      type,
      comments,
      assignedTo: assignedTo || undefined,
      // priority: 'medium', // Default priority
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