import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Request } from "@/models/Request";
import { BatterySwap } from "@/models/BatterySwap";
import { getTeamByCountryCode } from "@/data/countries";
import { IRequest } from "@/lib/types";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all non-completed requests, ordered by creation date (oldest first)
    const requests = await Request.findAll();
    const [outstandingSwaps, batteryPool] = await Promise.all([
      BatterySwap.findAll({ status: 'swapped' }),
      BatterySwap.getPoolStatus(),
    ]);
    // Oldest first, matching the request-queue sort below.
    outstandingSwaps.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Define enriched request type
    type EnrichedRequest = IRequest & { country_name: string };
    
    // Group by type and separate by status. battery_charging is
    // deliberately omitted — Battery Swaps supersedes it on this display,
    // and the `if (groupedRequests[type])` guard below means omitting it
    // here also keeps it out of the totalOpen/totalInProgress summary.
    const groupedRequests = {
      hardware: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
      software: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
      machine_shop: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
    };
    
    let totalOpen = 0;
    let totalInProgress = 0;
    
    requests.forEach((request) => {
      // Add country name to request
      const country = getTeamByCountryCode(request.country_code);
      const enrichedRequest = {
        ...request,
        country_name: country?.name || request.country_code,
      };
      
      const type = request.type as keyof typeof groupedRequests;
      if (groupedRequests[type]) {
        // A request is "open" (unassigned) only if status is 'open' AND no one is assigned
        // A request is "in progress" if it has someone assigned OR status is 'in-progress'
        if (request.status === 'open' && !request.assigned_to) {
          groupedRequests[type].open.push(enrichedRequest);
          totalOpen++;
        } else if (request.status === 'in-progress' || (request.status === 'open' && request.assigned_to)) {
          groupedRequests[type].inProgress.push(enrichedRequest);
          totalInProgress++;
        }
      }
    });
    
    // Sort each group by created_at (oldest first)
    Object.values(groupedRequests).forEach((typeGroup) => {
      typeGroup.open.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      typeGroup.inProgress.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    
    return NextResponse.json({
      summary: {
        totalOpen,
        totalInProgress,
      },
      requests: groupedRequests,
      batterySwaps: {
        outstanding: outstandingSwaps,
        pool: batteryPool,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/queue-display:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}