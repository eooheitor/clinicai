"use client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "CLINIC";
  clinic: {
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
    trialEndsAt: string | null;
  } | null;
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}
