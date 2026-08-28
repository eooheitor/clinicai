import { SubscriptionStatus } from "@prisma/client";

export function isSubscriptionBlocked(clinic: {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
}): boolean {
  const { subscriptionStatus, trialEndsAt } = clinic;
  if (subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELLED") return true;
  if (subscriptionStatus === "TRIAL" && trialEndsAt && new Date() > trialEndsAt) return true;
  return false;
}
