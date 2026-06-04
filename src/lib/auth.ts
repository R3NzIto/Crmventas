import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

interface TenantUser extends NextAuthUser {
  agencyId: string;
  role: string;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<TenantUser | null> {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
        });
        if (!user) {
          return null;
        }

        const validPassword = await compare(parsed.data.password, user.hashedPassword);
        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          agencyId: user.agencyId,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const tenantUser = user as TenantUser;
        token.userId = tenantUser.id;
        token.agencyId = tenantUser.agencyId;
        token.role = tenantUser.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? "");
        session.user.agencyId = String(token.agencyId ?? "");
        session.user.role = String(token.role ?? "");
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};
