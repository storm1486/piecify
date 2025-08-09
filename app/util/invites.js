// src/utils/invites.js
import { addDoc, serverTimestamp } from "firebase/firestore";
import { getOrgCollection } from "@/src/utils/firebaseHelpers";

// Creates an org-scoped invite and returns a /join URL that includes orgId + token
export async function createInviteLink({
  orgId,
  createdBy,
  role = "user", // default role for new members
  expiresInHours = 168, // 7 days
  maxUses = 25,
}) {
  if (!orgId) throw new Error("orgId is required");

  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

  await addDoc(getOrgCollection(orgId, "invites"), {
    token,
    role,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt, // stored as Date; you can store as Timestamp if you prefer
    maxUses,
    uses: 0,
    isDisabled: false,
  });

  const base = typeof window !== "undefined" ? window.location.origin : "";
  // Include orgId in the URL so we can look up the invite without a global collection
  return `${base}/join?org=${encodeURIComponent(
    orgId
  )}&token=${encodeURIComponent(token)}`;
}
