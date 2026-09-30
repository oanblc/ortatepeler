import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "./repositories";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import type { User } from "@/types";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const all = await users.list();
  return all.find((u) => u.id === session.userId) ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export function canAccessCustomer(user: User, sorumluMuhendisId: string) {
  return user.rol === "admin" || user.id === sorumluMuhendisId;
}
