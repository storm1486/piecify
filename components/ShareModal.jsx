"use client";

import { useState, useEffect } from "react";
import { getDocs } from "firebase/firestore";
import { sendEmail } from "@/app/util/sendEmail";
import { useUser } from "@/src/context/UserContext";
import { getOrgCollection } from "@/src/utils/firebaseHelpers";
import { useOrganization } from "@/src/context/OrganizationContext";

export default function ShareLinkModal({ isOpen, onClose, shareLink }) {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { orgId } = useOrganization();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Fetch all users from Firestore
  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(getOrgCollection(orgId, "users"));
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert("Link copied to clipboard!");
  };

  // Simulate email sending
  const handleSendEmail = async () => {
    if (!selectedUser) {
      alert("Please select a user to send the link.");
      return;
    }

    try {
      await sendEmail({
        to: selectedUser,
        subject: "A file has been shared with you",
        html: `
          <p>Hello,</p>
          <p>Officer, ${
            user.firstName + " " + user.lastName
          } has shared a file with you. Click the link below to view it:</p>
          <a href="${shareLink}">${shareLink}</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 10000);
    } catch (error) {
      alert("Failed to send email.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Share File</h2>

        <p className="text-sm text-gray-500 mb-4">
          Copy the link or email it to a user:
        </p>

        {/* Share Link Input */}
        <div className="flex items-center border border-gray-300 rounded-lg p-2 mb-4">
          <input
            type="text"
            value={shareLink}
            readOnly
            className="w-full bg-transparent outline-none text-gray-900 dark:text-gray-100"
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded"
            onClick={handleCopyLink}
          >
            Copy
          </button>
        </div>

        {/* User Selection for Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Send to:
          </label>
          <select
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- Select a User --</option>
            {users.map((user) => (
              <option key={user.id} value={user.email}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Send Email Button */}
        <button
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handleSendEmail}
        >
          Send via Email
        </button>

        {/* Success Message */}
        {emailSent && (
          <p className="text-green-500 text-sm mt-2 text-center">
            Email sent successfully!
          </p>
        )}

        {/* Close Button */}
        <button
          className="w-full mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
