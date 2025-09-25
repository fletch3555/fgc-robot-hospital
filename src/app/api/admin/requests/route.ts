import { NextResponse } from "next/server";
import { Request } from "@/models/Request";
import { connectToDatabase } from "@/lib/database";
import { checkPermissions } from "@/lib/authz";

export async function GET() {
  try {
    const authz = await checkPermissions(['admin.requests']);

    if (!authz.authorized) {
      return authz.response!;
    }
    
    await connectToDatabase();

    // Get all requests including completed ones, with custom sorting for admin view
    const requests = await Request.findAllForAdmin();

    return new NextResponse(JSON.stringify(requests), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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