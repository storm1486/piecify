// utils/sendEmail.ts
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Adjust path as needed
import { useOrganization } from "@/src/context/OrganizationContext";
import { getOrgCollection } from "@/src/utils/firebaseHelpers";

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const { orgId } = useOrganization();
  try {
    await addDoc(getOrgCollection(orgId, "mail"), {
      to,
      message: {
        subject,
        html,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
