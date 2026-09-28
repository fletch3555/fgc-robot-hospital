import { NextRequest, NextResponse } from "next/server";
import { Request } from "@/models/Request";
import { connectToDatabase } from "@/lib/database";
import { checkPermissions } from "@/lib/authz";
import { getCurrentSeason } from "@/lib/season";

export async function GET(req: NextRequest) {
  try {
    const authz = await checkPermissions(['admin.requests']);

    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const seasonParam = req.nextUrl.searchParams.get('season');
    const season = seasonParam === 'all' ? 'all' : seasonParam ? parseInt(seasonParam, 10) : undefined;

    // Get all requests including completed ones, with custom sorting for
    // admin view. `seasons` (every distinct season with data) always
    // reflects the full history regardless of which one `requests` is
    // currently filtered to, so the dropdown's options don't shrink to
    // just whatever's selected.
    const [requests, seasons] = await Promise.all([
      Request.findAllForAdmin(season),
      Request.findDistinctSeasons(),
    ]);

    return NextResponse.json({ requests, seasons, currentSeason: getCurrentSeason() });
  } catch (error) {
    console.error("Error in GET /api/admin/requests:", error);

    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
