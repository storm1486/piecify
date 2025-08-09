// util/shareFile.js
import { addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getOrgCollection, getOrgDoc } from "@/src/utils/firebaseHelpers";

export async function generateShareLink({
  orgId,
  fileId,
  user,
  expiresInHours = 24,
}) {
  if (!orgId) throw new Error("orgId is required to generate a share link");
  if (!fileId) throw new Error("fileId is required to generate a share link");

  // Prefer crypto UUID when available
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Use Firestore Timestamp for clean rule checks & comparisons
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
  );

  // Always store a DocumentReference to the file (plus fileId as a handy fallback)
  await addDoc(getOrgCollection(orgId, "sharedLinks"), {
    token,
    fileRef: getOrgDoc(orgId, "files", fileId), // ✅ key fix
    fileId, // optional fallback
    createdBy: user?.uid ?? null,
    createdByName: user
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : null,
    createdAt: serverTimestamp(),
    expiresAt, // ✅ Timestamp (not Date)
    used: false,
  });

  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/viewSharedFile/${token}`;
}
