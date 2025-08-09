// utils/sendEmail.ts
import { addDoc, serverTimestamp } from "firebase/firestore";
import { getOrgCollection } from "@/src/utils/firebaseHelpers";

type SendEmailArgs = {
  orgId: string; // <-- pass this in from the component
  to: string | string[]; // extension accepts single or array
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

export const sendEmail = async ({
  orgId,
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailArgs) => {
  if (!orgId) throw new Error("orgId is required for sendEmail()");
  if (!to) throw new Error("recipient 'to' is required");
  if (!subject) throw new Error("subject is required");
  if (!html && !text) throw new Error("html or text is required");

  const payload: any = {
    to: Array.isArray(to) ? to : [to],
    message: {
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    },
    ...(replyTo ? { replyTo } : {}),
    createdAt: serverTimestamp(),
  };

  // Writes to: organizations/{orgId}/mail/{mailId}
  await addDoc(getOrgCollection(orgId, "mail"), payload);
};
