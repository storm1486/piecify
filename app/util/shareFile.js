import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export const generateShareLink = async (fileId, currentUser) => {
  if (
    !currentUser ||
    !(currentUser.role === "admin" || currentUser.role === "coach")
  ) {
    console.error(
      "Permission denied: Only admins or coaches can generate temporary links."
    );
    return null;
  }

  try {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

    await addDoc(collection(db, "sharedLinks"), {
      fileRef: `/files/${fileId}`,
      adminId: currentUser.uid, // Store admin who created link
      expiresAt,
      token,
      createdAt: serverTimestamp(),
    });

    return `${window.location.origin}/viewSharedFile/${token}`; // 🔹 Updated URL structure
  } catch (error) {
    console.error("Error generating share link:", error);
    return null;
  }
};
