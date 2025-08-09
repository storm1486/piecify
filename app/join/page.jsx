// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   collection,
//   doc,
//   getDocs,
//   increment,
//   limit,
//   query,
//   serverTimestamp,
//   updateDoc,
//   where,
//   setDoc,
// } from "firebase/firestore";
// import { db } from "@/app/firebase/firebase";
// import { useUser } from "@/src/context/UserContext";
// import { useOrganization } from "@/src/context/OrganizationContext";

// export default function JoinClient({ orgId, token }) {
//   const router = useRouter();
//   const { user } = useUser();
//   const { switchOrganization } = useOrganization();

//   const [status, setStatus] = useState("Checking invite…");
//   const [error, setError] = useState("");
//   const [done, setDone] = useState(false);

//   const canStart = useMemo(
//     () => Boolean(orgId && token && user),
//     [orgId, token, user]
//   );

//   // If missing params or not logged in, handle early
//   useEffect(() => {
//     if (!orgId || !token) {
//       setError("Invalid join link.");
//       setStatus("");
//       return;
//     }
//     if (!user) {
//       router.replace(
//         `/login?next=${encodeURIComponent(`/join?org=${orgId}&token=${token}`)}`
//       );
//     }
//   }, [orgId, token, user, router]);

//   // Consume invite and add/merge org-scoped user
//   useEffect(() => {
//     if (!canStart || done) return;

//     let cancelled = false;

//     (async () => {
//       try {
//         setStatus("Validating invite…");

//         // 1) Find invite by token in this org
//         const invitesQ = query(
//           collection(db, "organizations", orgId, "invites"),
//           where("token", "==", token),
//           limit(1)
//         );
//         const snap = await getDocs(invitesQ);
//         if (snap.empty) {
//           throw new Error("Invite not found or already used.");
//         }

//         const inviteDoc = snap.docs[0];
//         const invite = inviteDoc.data() || {};

//         // 2) Basic validations
//         if (invite.isDisabled)
//           throw new Error("This invite has been disabled.");
//         if (invite.maxUses && invite.uses >= invite.maxUses)
//           throw new Error("This invite has reached its maximum uses.");

//         if (invite.expiresAt) {
//           const expiresAt = invite.expiresAt.toDate
//             ? invite.expiresAt.toDate()
//             : new Date(invite.expiresAt);
//           if (Date.now() > expiresAt.getTime())
//             throw new Error("This invite has expired.");
//         }

//         if (cancelled) return;

//         setStatus("Adding you to the organization…");

//         // 3) Upsert org user doc (idempotent)
//         const orgUserRef = doc(db, "organizations", orgId, "users", user.uid);
//         await setDoc(
//           orgUserRef,
//           {
//             uid: user.uid,
//             email: user.email || "",
//             firstName: user.firstName || "",
//             lastName: user.lastName || "",
//             role: invite.role || "user",
//             joinedAt: serverTimestamp(),
//           },
//           { merge: true }
//         );

//         // 4) Increment invite uses
//         await updateDoc(inviteDoc.ref, { uses: increment(1) });

//         if (cancelled) return;

//         // 5) Switch active org (accepts uid override if your provider supports it)
//         try {
//           await switchOrganization(orgId, user.uid);
//         } catch (e) {
//           // Don't block redirect if this fails; OrgProvider will catch up on next render
//           console.warn("switchOrganization failed:", e);
//         }

//         if (cancelled) return;

//         // 6) Redirect home
//         setStatus("Success! Redirecting…");
//         setDone(true);
//         router.replace("/");
//       } catch (e) {
//         if (cancelled) return;
//         console.error(e);
//         setError(e?.message || "Failed to join organization.");
//         setStatus("");
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [canStart, done, orgId, token, user, router, switchOrganization]);

//   return (
//     <main className="min-h-screen flex items-center justify-center p-6">
//       <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
//         <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
//           Join Organization
//         </h1>

//         {status && (
//           <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
//         )}
//         {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
//       </div>
//     </main>
//   );
// }
