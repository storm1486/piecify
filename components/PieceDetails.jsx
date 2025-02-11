"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../app/firebase/firebase";
import { useUser } from "@/src/context/UserContext";

export default function PieceDetails({ fileId, onClose }) {
  const { user } = useUser();
  const [docData, setDocData] = useState(null);
  const [previousOwners, setPreviousOwners] = useState([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (docData?.pieceDescription && !isEditingDescription) {
      setNewDescription(docData.pieceDescription);
    }
  }, [docData, isEditingDescription]);

  useEffect(() => {
    const fetchFileData = async () => {
      if (!fileId) return;

      try {
        const fileRef = doc(db, "files", fileId);
        const fileSnap = await getDoc(fileRef);

        if (fileSnap.exists()) {
          const fileData = fileSnap.data();
          setDocData(fileData);
          setNewDescription(
            fileData.pieceDescription || "No description provided."
          );
        }
      } catch (error) {
        console.error("Error fetching file details:", error);
      }
    };

    fetchFileData();
  }, [fileId]);

  useEffect(() => {
    if (!docData?.previouslyOwned?.length) {
      setPreviousOwners([]);
      return;
    }

    const fetchPreviousOwners = async () => {
      try {
        const ownerDetails = await Promise.all(
          docData.previouslyOwned.map(async (owner) => {
            const userRef = doc(db, "users", owner.userId);
            const userSnap = await getDoc(userRef);
            return {
              name: userSnap.exists()
                ? `${userSnap.data().firstName} ${userSnap.data().lastName}`|| userSnap.data().email
                : "Unknown User",
              dateGiven: owner.dateGiven,
            };
          })
        );
        setPreviousOwners(ownerDetails);
      } catch (error) {
        console.error("Error fetching previous owners:", error);
      }
    };

    fetchPreviousOwners();
  }, [docData]);

  console.log(previousOwners)

  const handleUpdateDescription = async () => {
    try {
      if (!fileId) {
        throw new Error("File ID is missing!");
      }

      const fileRef = doc(db, "files", fileId);
      await updateDoc(fileRef, { pieceDescription: newDescription });

      setDocData((prevData) => ({
        ...prevData,
        pieceDescription: newDescription,
      }));

      setIsEditingDescription(false);
      alert("Description updated successfully!");
    } catch (error) {
      console.error("Error updating description:", error);
      alert("Failed to update description.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Piece Details</h2>

          {user?.role === "admin" && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-700 dark:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                  />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-lg z-30">
                  <ul className="py-2 text-gray-800 dark:text-white">
                    <li
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        setIsEditingDescription(true);
                        setIsMenuOpen(false);
                      }}
                    >
                      Edit Description
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <strong>Description:</strong>
          {isEditingDescription ? (
            <>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => setIsEditingDescription(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDescription}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <p>{docData?.pieceDescription || "No description provided."}</p>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-2">Previous Owners:</h3>
        {previousOwners.length > 0 ? (
          <ul className="list-disc pl-4">
            {previousOwners.map((owner, index) => (
              <li key={index}>
                <span className="font-medium">{owner.name}</span>
                <br />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Assigned on: {new Date(owner.dateGiven).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No previous owners.</p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
