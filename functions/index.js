import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

export const moveOldFiles = onSchedule("0 0 * * *", async () => {
  // Runs at midnight UTC
  console.log("Running file cleanup function...");

  const usersSnapshot = await db.collection("users").get();
  const cutoffDate = new Date(); // Use today's date to move past files

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const myFiles = userData.myFiles || [];
    const previousFiles = userData.previousFiles || [];

    const updatedFiles = [];

    for (const file of myFiles) {
      if (new Date(file.dateGiven) < cutoffDate) {
        previousFiles.push(file);

        // ** Step 1: Get the file document reference **
        const fileRef = file.fileRef;
        if (fileRef) {
          try {
            const fileDocRef = db.doc(fileRef.path); // Get actual file document
            const fileDoc = await fileDocRef.get();

            if (fileDoc.exists) {
              // ** Step 2: Remove "currentOwner" by updating the file document **
              await fileDocRef.update({
                currentOwner: [], // Empty the currentOwner array
              });
              console.log(`Cleared currentOwner for file: ${fileRef.path}`);
            }
          } catch (error) {
            console.error(`Error updating file ${fileRef.path}:`, error);
          }
        }
      } else {
        updatedFiles.push(file);
      }
    }

    // ** Step 3: Update user document with new files **
    await db.collection("users").doc(userDoc.id).update({
      myFiles: updatedFiles,
      previousFiles: previousFiles,
    });

    console.log(`Moved old files and cleared owners for user: ${userDoc.id}`);
  }

  console.log("File cleanup function completed.");
});
