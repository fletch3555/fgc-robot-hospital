import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Request } from "@/models/Request";
import { getTeamByCountryCode } from "@/data/countries";
import { IRequest } from "@/lib/types";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all non-completed requests, ordered by creation date (oldest first)
    const requests = await Request.findAll();
    
    // Define enriched request type
    type EnrichedRequest = IRequest & { country_name: string };
    
    // Group by type and separate by status
    const groupedRequests = {
      hardware: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
      software: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
      machine_shop: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
      battery_charging: { open: [] as EnrichedRequest[], inProgress: [] as EnrichedRequest[] },
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
        if (request.status === 'open') {
          groupedRequests[type].open.push(enrichedRequest);
          totalOpen++;
        } else if (request.status === 'in-progress') {
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
    });
  } catch (error) {
    console.error("Error in GET /api/queue-display:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}