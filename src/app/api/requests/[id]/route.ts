import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Request } from "@/models/Request";
import { checkPermissions } from "@/lib/authz";
import { PermissionName } from "@/lib/auth-types";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authz = await checkPermissions(['requests.view']);
  if (!authz.authorized) {
    return authz.response!;
  }

  try {
    const params = await context.params;

    await connectToDatabase();

    const request = await Request.findById(params.id);

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(request, { status: 200 });
  } catch (error) {
    console.error(`Error in GET /api/requests/${(await context.params).id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // First check if user is authenticated
  const authCheck = await checkPermissions(['requests.view']);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const params = await context.params;

    // Get the request to determine its type
    await connectToDatabase();
    const existingRequest = await Request.findById(params.id);
    
    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check for type-specific edit permission based on request type
    const typeSpecificPermission = `${existingRequest.type}.edit` as PermissionName;
    const authz = await checkPermissions([typeSpecificPermission, 'requests.edit'], false);
    if (!authz.authorized) {
      return authz.response!;
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    
    if (body.status) updateData.status = body.status;
    // if (body.priority) updateData.priority = body.priority;
    if (body.comments !== undefined) updateData.comments = body.comments;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
    if (body.country_code) updateData.country_code = body.country_code;
    
    // Handle type-specific data fields
    if (body.hardwareData) updateData.hardware_data = JSON.stringify(body.hardwareData);
    if (body.softwareData) updateData.software_data = JSON.stringify(body.softwareData);
    if (body.machineShopData) updateData.machine_shop_data = JSON.stringify(body.machineShopData);
    if (body.batteryChargingData) updateData.battery_charging_data = JSON.stringify(body.batteryChargingData);

    await connectToDatabase();

    const updatedRequest = await Request.update(params.id, updateData);

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Fetch the complete request with joined user names
    const completeRequest = await Request.findById(params.id);

    return NextResponse.json(completeRequest, { status: 200 });
  } catch (error) {
    console.error(`Error in PATCH /api/requests/${(await context.params).id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authz = await checkPermissions(['requests.delete']);
  if (!authz.authorized) {
    return authz.response!;
  }

  try {
    const params = await context.params;
    const { session } = authz;

    await connectToDatabase();

    const request = await Request.findById(params.id);
    
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only allow deletion if the user is the submitter or has admin permissions
    const isOwner = request.submitted_by === session!.user.id;
    const hasAdminPermission = session!.user.roles?.includes("admin");
    
    if (!isOwner && !hasAdminPermission) {
      return NextResponse.json(
        { error: "Not authorized to delete this request" },
        { status: 403 }
      );
    }

    await Request.delete(params.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error in DELETE /api/requests/${(await context.params).id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}