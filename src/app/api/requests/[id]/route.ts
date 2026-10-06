import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, withTransaction } from "@/lib/database";
import { Request } from "@/models/Request";
import { checkPermissions } from "@/lib/authz";
import { PermissionName } from "@/lib/auth-types";
import { reserveBatteryUnit, BatteryUnitConflictError } from "@/lib/batteryPool";

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

    const body = await req.json();

    // Check for type-specific edit permission based on request type. A
    // battery_charging request being marked returned also accepts the
    // dedicated .return permission -- the queue's Return button is gated
    // on it specifically (not .edit), so a role granted only .return
    // must actually be able to complete this transition server-side too.
    const typeSpecificPermission = `${existingRequest.type}.edit` as PermissionName;
    const isBatteryReturn =
      existingRequest.type === 'battery_charging' &&
      body.status === 'completed' &&
      existingRequest.status !== 'completed';
    const requiredPermissions: PermissionName[] = isBatteryReturn
      ? [typeSpecificPermission, 'requests.edit', 'battery_charging.return']
      : [typeSpecificPermission, 'requests.edit'];
    const authz = await checkPermissions(requiredPermissions, false);
    if (!authz.authorized) {
      return authz.response!;
    }

    // Confirming a battery is actually returned (by picking a checked-out unit and closing
    // its stale loan) requires battery_charging.return specifically, same as the dedicated
    // Return button -- checked as a separate, strictly-required permission (unlike the OR-style
    // check above) since .edit alone must NOT be enough to force-close someone else's loan.
    if (body.confirmedSupersedeRequestId) {
      const returnAuthz = await checkPermissions(['battery_charging.return']);
      if (!returnAuthz.authorized) {
        return returnAuthz.response!;
      }
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.status) updateData.status = body.status;
    // if (body.priority) updateData.priority = body.priority;
    if (body.comments !== undefined) updateData.comments = body.comments;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
    if (body.country_code) updateData.country_code = body.country_code;

    // A battery_charging request's "handled_by" (who processed the
    // return) is always stamped server-side from the current session,
    // never taken from the request body -- this is what "Mark Returned"
    // means for this request type, mirroring the old battery_swaps
    // feature's markReturned behavior.
    if (isBatteryReturn) {
      updateData.handled_by = authz.session!.user.id;
    }
    
    // Handle type-specific data fields
    if (body.hardwareData) updateData.hardware_data = JSON.stringify(body.hardwareData);
    if (body.softwareData) updateData.software_data = JSON.stringify(body.softwareData);
    if (body.machineShopData) updateData.machine_shop_data = JSON.stringify(body.machineShopData);
    if (body.batteryChargingData) updateData.battery_charging_data = JSON.stringify(body.batteryChargingData);

    await connectToDatabase();

    // Reassigning/confirming a loaner number claims it atomically, same as
    // create -- excluding this request's own id from the conflict check,
    // since it may already legitimately reference this exact number.
    const editedBatteryData = body.batteryChargingData;
    const isLoanerCheckout =
      existingRequest.type === 'battery_charging' &&
      editedBatteryData?.loanerProvided !== false &&
      editedBatteryData?.batteryType &&
      editedBatteryData?.loanerBatteryNumber;

    const updatedRequest = isLoanerCheckout
      ? await withTransaction(async (queryFn) => {
          await reserveBatteryUnit(
            queryFn,
            editedBatteryData.batteryType,
            editedBatteryData.loanerBatteryNumber,
            existingRequest.season,
            existingRequest.id,
            body.confirmedSupersedeRequestId || undefined,
            body.confirmedSupersedeRequestId ? authz.session!.user.id : undefined,
            body.confirmedSupersedeRequestId
              ? `Closed automatically: battery_charging #${editedBatteryData.loanerBatteryNumber} was re-loaned to ${(body.country_code || existingRequest.country_code).toUpperCase()} before being marked returned.`
              : undefined
          );
          return Request.update(params.id, updateData, queryFn);
        })
      : await Request.update(params.id, updateData);

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Fetch the complete request with joined user names
    const completeRequest = await Request.findById(params.id);

    return NextResponse.json(completeRequest, { status: 200 });
  } catch (error) {
    if (error instanceof BatteryUnitConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
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