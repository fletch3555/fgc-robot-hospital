import { NextRequest, NextResponse } from "next/server";
import { checkPermissions } from "@/lib/authz";
import { User } from "@/models/User";
import { IUser } from "@/lib/types";
import { connectToDatabase } from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    const authz = await checkPermissions(['users.view']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    const { searchParams } = new URL(req.url);
    const roles = searchParams.get('roles')?.split(',');

    await connectToDatabase();

    let users: IUser[];
    if (roles && roles.length > 0) {
      users = await User.findByRoles(roles);
    } else {
      users = await User.findAll();
    }

    // Return users without sensitive information
    const sanitizedUsers = users.map((user: IUser) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    }));

    return NextResponse.json(sanitizedUsers, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}