"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebase";
import { useUser } from "@/src/context/UserContext";
import { useOrganization } from "@/src/context/OrganizationContext";

export default function JoinClient({ orgId, token }) {
  const router = useRouter();
  const { user } = useUser();
  const { switchOrganization } = useOrganization();

  const [status, setStatus] = useState("Checking invite…");
  const [error, setError] = useState("");

  const canStart = useMemo(
    () => Boolean(orgId && token && user),
    [orgId, token, user]
  );

  useEffect(() => {
    if (!orgId || !token) {
      setError("Invalid join link.");
      setStatus("");
      return;
    }
    if (!user) {
      // require login first
      router.replace(
        `/login?next=${encodeURIComponent(`/join?org=${orgId}&token=${token}`)}`
      );
    }
  }, [orgId, token, user, router]);

  useEffect(() => {
    if (!canStart) return;

    const run = async () => {
      try {
        setStatus("Validating invite…");

        const invitesQ = query(
          collection(db, "organizations", orgId, "invites"),
          where("token", "==", token),
          limit(1)
        );
        const snap = await getDocs(invitesQ);

        if (snap.empty) {
          throw new Error("Invite not found or already used.");
        }

        const inviteDoc = snap.docs[0];
        const invite = inviteDoc.data() || {};

        if (invite.isDisabled)
          throw new Error("This invite has been disabled.");
        if (invite.maxUses && invite.uses >= invite.maxUses)
          throw new Error("This invite has reached its maximum uses.");

        if (invite.expiresAt) {
          const expiresAt = invite.expiresAt.toDate
            ? invite.expiresAt.toDate()
            : new Date(invite.expiresAt);
          if (Date.now() > expiresAt.getTime())
            throw new Error("This invite has expired.");
        }

        setStatus("Adding you to the organization…");

        const orgUserRef = doc(db, "organizations", orgId, "users", user.uid);
        // ...
        await setDoc(
          orgUserRef,
          {
            uid: user.uid,
            email: user.email || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            role: invite.role || "user",
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await updateDoc(inviteDoc.ref, { uses: increment(1) });

        // switch active org using uid override
        await switchOrganization(orgId, user.uid);

        setStatus("Success! Redirecting…");
        router.replace("/");
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to join organization.");
        setStatus("");
      }
    };

    run();
  }, [canStart, orgId, token, user, router, switchOrganization]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
        <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Join Organization
        </h1>
        {status && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </main>
  );
}
