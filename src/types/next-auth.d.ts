// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from "next-auth/next";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
  }
}