import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, withTransaction } from "@/lib/database";
import { Request } from "@/models/Request";
import { User } from "@/models/User";
import { checkPermissions } from "@/lib/authz";
import { PermissionName } from "@/lib/auth-types";
import { reserveBatteryUnit, BatteryUnitConflictError } from "@/lib/batteryPool";
import { getCurrentSeason } from "@/lib/season";

export async function GET(req: NextRequest) {
  try {
    const authz = await checkPermissions(['requests.view', 'hardware.view', 'software.view', 'machine_shop.view', 'battery_charging.view'], false);

    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const allSeasons = req.nextUrl.searchParams.get('allSeasons') === 'true';
    const season = allSeasons ? 'all' : undefined;

    // Fetch active requests (open and in-progress)
    const activeRequests = (await Request.findAll({ season })).filter(request => {
      // Filter requests based on type and user permissions
      if (request.type === 'hardware')
        return authz.permissions?.includes('hardware.view');
      if (request.type === 'software')
        return authz.permissions?.includes('software.view');
      if (request.type === 'machine_shop')
        return authz.permissions?.includes('machine_shop.view');
      if (request.type === 'battery_charging')
        return authz.permissions?.includes('battery_charging.view');

      return false;
    });

    // Fetch recently closed requests (last 10)
    const closedRequests = (await Request.findRecentlyClosed(10, season)).filter(request => {
      // Filter requests based on type and user permissions
      if (request.type === 'hardware')
        return authz.permissions?.includes('hardware.view');
      if (request.type === 'software')
        return authz.permissions?.includes('software.view');
      if (request.type === 'machine_shop')
        return authz.permissions?.includes('machine_shop.view');
      if (request.type === 'battery_charging')
        return authz.permissions?.includes('battery_charging.view');

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

const VALID_REQUEST_TYPES = ['hardware', 'software', 'machine_shop', 'battery_charging'];

export async function POST(req: NextRequest) {
  // Authentication (and the broad create permission) is checked first,
  // unconditional on the request body, so an unauthenticated caller with a
  // malformed/invalid body still gets 401 rather than a body-validation
  // 400 jumping the queue.
  const authz = await checkPermissions(['requests.create']);
  if (!authz.authorized) {
    return authz.response!;
  }

  try {
    const { session } = authz;

    const body = await req.json();
    const { countryCode, type, comments, assignedTo, hardwareData, softwareData, machineShopData, batteryChargingData } = body;

    if (!countryCode || !type || !VALID_REQUEST_TYPES.includes(type)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Also require the type-specific create permission. requests.create
    // alone used to be sufficient for any type -- a role without, say,
    // hardware.create could still create a hardware request via
    // useRequestForm's fixedType path (a locked-type create host like
    // /requests/hardware), which only offers/locks the one type but
    // didn't use to re-verify it server-side.
    const typeAuthz = await checkPermissions([`${type}.create` as PermissionName]);
    if (!typeAuthz.authorized) {
      return typeAuthz.response!;
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

    const requestData = {
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
    };

    // A loaner checkout claims a specific numbered unit -- do that
    // atomically with the insert (same transaction, unit reserved via an
    // advisory lock) so two intake stations can't both grab the same
    // freshly-available number. Every other request type/case is
    // unaffected and keeps using the plain single-connection query().
    const isLoanerCheckout =
      type === 'battery_charging' &&
      batteryChargingData?.loanerProvided !== false &&
      batteryChargingData?.batteryType &&
      batteryChargingData?.loanerBatteryNumber;

    const newRequest = isLoanerCheckout
      ? await withTransaction(async (queryFn) => {
          await reserveBatteryUnit(
            queryFn,
            batteryChargingData.batteryType,
            batteryChargingData.loanerBatteryNumber,
            getCurrentSeason()
          );
          return Request.create(requestData, queryFn);
        })
      : await Request.create(requestData);

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    if (error instanceof BatteryUnitConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error in POST /api/requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}