// functions/index.js
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const moveOldFiles = onSchedule(
  { schedule: "0 0 1 7 *", timeZone: "UTC" },
  async () => {
    console.log("Running org-scoped file cleanup…");

    // July is month index 6 (0-based)
    const cutoffDate = new Date(new Date().getFullYear(), 6, 1);

    const orgsSnap = await db.collection("organizations").get();

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      console.log(`Processing organization: ${orgId}`);

      const usersSnap = await db
        .collection("organizations")
        .doc(orgId)
        .collection("users")
        .get();

      for (const userDoc of usersSnap.docs) {
        const userRef = userDoc.ref;
        const userData = userDoc.data() || {};

        const myFiles = Array.isArray(userData.myFiles) ? userData.myFiles : [];
        const previousFiles = Array.isArray(userData.previousFiles)
          ? userData.previousFiles
          : [];

        const updatedMyFiles = [];

        for (const entry of myFiles) {
          const dateGivenStr = entry && entry.dateGiven;
          const dateGiven = dateGivenStr ? new Date(dateGivenStr) : null;

          if (dateGiven && dateGiven < cutoffDate) {
            // Move to previousFiles
            previousFiles.push(entry);

            // Clear currentOwner on the linked file document
            const fileRef = entry && entry.fileRef;
            if (fileRef) {
              try {
                await db.doc(fileRef.path).update({ currentOwner: [] });
                console.log(`Cleared currentOwner for file: ${fileRef.path}`);
              } catch (err) {
                console.error(
                  `Error updating file ${fileRef && fileRef.path}:`,
                  err
                );
              }
            }
          } else {
            updatedMyFiles.push(entry);
          }
        }

        await userRef.update({
          myFiles: updatedMyFiles,
          previousFiles: previousFiles,
        });

        console.log(`User processed: ${userRef.path}`);
      }
    }

    console.log("Org-scoped file cleanup completed.");
  }
);

export const deleteExpiredLinks = onSchedule(
  { schedule: "every 24 hours", timeZone: "UTC" },
  async () => {
    console.log("Running org-scoped expired share link cleanup…");

    const now = new Date();
    const orgsSnap = await db.collection("organizations").get();

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      console.log(`Checking sharedLinks for org: ${orgId}`);

      const linksSnap = await db
        .collection("organizations")
        .doc(orgId)
        .collection("sharedLinks")
        .get();

      const batch = db.batch();

      linksSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        // Support Timestamp or ISO string
        const expiresAt =
          data.expiresAt && data.expiresAt.toDate
            ? data.expiresAt.toDate()
            : data.expiresAt
            ? new Date(data.expiresAt)
            : null;

        if (expiresAt && expiresAt < now) {
          batch.delete(docSnap.ref);
        }
      });

      await batch.commit();
      console.log(`Expired links cleanup complete for org: ${orgId}`);
    }

    console.log("All organizations cleaned up.");
  }
);
