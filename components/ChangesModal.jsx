"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebase"; // Adjust path if needed
import { useState } from "react";

export default function ChangesModal({ file, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!file || !file.pendingIntroChange) return null;

  const { id, fileName, intro, pendingIntroChange } = file;

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      const fileRef = doc(db, "files", id);
      await updateDoc(fileRef, {
        intro: pendingIntroChange.newIntro,
        pendingIntroChange: null,
      });
      onClose(); // Close the modal after approving
    } catch (error) {
      console.error("Error approving intro change:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      const fileRef = doc(db, "files", id);
      await updateDoc(fileRef, {
        pendingIntroChange: null,
      });
      onClose(); // Close the modal after rejecting
    } catch (error) {
      console.error("Error rejecting intro change:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-4">Review Intro Change</h2>

        <div className="mb-4">
          <p className="font-semibold">File:</p>
          <p>{fileName}</p>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Current Intro:</p>
          <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
            {intro || "No intro provided."}
          </p>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Proposed Intro:</p>
          <p className="bg-green-100 dark:bg-green-700 p-2 rounded">
            {pendingIntroChange.newIntro}
          </p>
        </div>

        <div className="mb-6">
          <p className="font-semibold">Proposed By:</p>
          <p>{pendingIntroChange.proposedBy}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded"
            onClick={handleReject}
            disabled={isProcessing}
          >
            Reject
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
