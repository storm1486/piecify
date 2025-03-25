// utils/sendEmail.ts
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Adjust path as needed

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    await addDoc(collection(db, "mail"), {
      to,
      message: {
        subject,
        html,
      },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
