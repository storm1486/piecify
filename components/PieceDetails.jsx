"use client";

import { useState, useEffect, useRef } from "react";
import { getDoc, updateDoc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";
import { useOrganization } from "@/src/context/OrganizationContext";
import { getOrgDoc } from "@/src/utils/firebaseHelpers";

export default function PieceDetails({ fileId, onClose }) {
  const { user, isPrivileged } = useUser();
  const isPrivilegedUser = isPrivileged();
  const [docData, setDocData] = useState(null);
  const [previousOwners, setPreviousOwners] = useState([]);
  const [currentOwner, setCurrentOwner] = useState(null);
  const [showPreviousOwners, setShowPreviousOwners] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [newIntro, setNewIntro] = useState("");
  const [isUserCurrentOwner, setIsUserCurrentOwner] = useState(false);
  const [showFullIntro, setShowFullIntro] = useState(false);
  const { orgId } = useOrganization();

  useEffect(() => {
    if (docData?.pieceDescription && !isEditingDescription) {
      setNewDescription(docData.pieceDescription);
    }
  }, [docData, isEditingDescription]);

  useEffect(() => {
    const fetchFileData = async () => {
      if (!fileId) return;

      try {
        const fileRef = getOrgDoc(orgId, "files", fileId);
        const fileSnap = await getDoc(fileRef);

        if (fileSnap.exists()) {
          const fileData = fileSnap.data();
          setDocData(fileData);
          if (
            fileData.currentOwner &&
            fileData.currentOwner.length > 0 &&
            fileData.currentOwner[0].userId === user?.uid
          ) {
            setIsUserCurrentOwner(true);
          }
          setNewDescription(
            fileData.pieceDescription || "No description provided."
          );
          setNewIntro(fileData.intro || "No intro provided.");

          // ✅ Fetch current owner details
          if (fileData.currentOwner && fileData.currentOwner.length > 0) {
            const ownerRef = getOrgDoc(
              orgId,
              "users",
              fileData.currentOwner[0].userId
            );
            const ownerSnap = await getDoc(ownerRef);

            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data();
              setCurrentOwner({
                name:
                  ownerData.firstName && ownerData.lastName
                    ? `${ownerData.firstName} ${ownerData.lastName}`
                    : ownerData.email || "Unknown User",
                dateGiven: fileData.currentOwner[0].dateGiven,
              });
            } else {
              setCurrentOwner({
                name: "Unknown User",
                dateGiven: fileData.currentOwner[0].dateGiven,
              });
            }
          } else {
            setCurrentOwner(null); // No current owner
          }
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
            const userRef = getOrgDoc(orgId, "users", owner.assignedUser);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
              return { name: "Unknown User", dateGiven: owner.dateGiven };
            }

            const userData = userSnap.data();
            const name =
              userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.email || "Unknown User"; // Fallback to email if name is missing

            return { name, dateGiven: owner.dateGiven };
          })
        );
        const sortedOwners = ownerDetails.sort((a, b) => {
          return (
            new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime()
          );
        });
        setPreviousOwners(sortedOwners);
      } catch (error) {
        console.error("Error fetching previous owners:", error);
      }
    };

    fetchPreviousOwners();
  }, [docData]);

  const getTruncatedTextWithEllipsis = (text, limit = 200) => {
    if (!text) return "";
    return text.length > limit ? text.slice(0, limit).trim() : text;
  };

  const handleUpdateDescription = async () => {
    try {
      if (!fileId) {
        throw new Error("File ID is missing!");
      }

      const fileRef = getOrgDoc(orgId, "files", fileId);
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

  const handleUpdateIntro = async () => {
    try {
      if (!fileId) throw new Error("File ID is missing!");
      const fileRef = getOrgDoc(orgId, "files", fileId);

      if (isPrivilegedUser) {
        await updateDoc(fileRef, { intro: newIntro });
        setDocData((prevData) => ({ ...prevData, intro: newIntro }));
        alert("Intro updated successfully!");
      } else {
        await updateDoc(fileRef, {
          pendingIntroChange: {
            proposedBy: `${user.firstName} ${user.lastName}`,
            newIntro,
            timestamp: new Date().toISOString(),
          },
        });
        alert("Intro change submitted for admin approval.");
      }

      setIsEditingIntro(false);
    } catch (error) {
      console.error("Error updating intro:", error);
      alert("Failed to update intro.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Piece Details</h1>

          {(isPrivilegedUser || isUserCurrentOwner) && (
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
                    {isPrivilegedUser && (
                      <li
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => {
                          setIsEditingDescription(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        Edit Description
                      </li>
                    )}
                    {(isPrivilegedUser || isUserCurrentOwner) && (
                      <li
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => {
                          setIsEditingIntro(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        Edit Intro
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mb-4">
          <h3 className="text-lg underline">Description:</h3>
          {isEditingDescription ? (
            <>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white min-h-[80px] max-h-60 overflow-y-auto resize-y"
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
        <div className="mb-4">
          <h3 className="text-lg underline">Intro:</h3>

          {isEditingIntro ? (
            <>
              <textarea
                value={newIntro}
                onChange={(e) => setNewIntro(e.target.value)}
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white min-h-[80px] max-h-60 overflow-y-auto resize-y"
              />

              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => setIsEditingIntro(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateIntro}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              {!showFullIntro ? (
                <p className="mt-2 dark:text-white">
                  {getTruncatedTextWithEllipsis(docData?.intro, 200)}
                  {docData?.intro?.length > 200 && (
                    <button
                      onClick={() => setShowFullIntro(true)}
                      className="hover:underline inline p-0 m-0 align-baseline"
                    >
                      ...
                    </button>
                  )}
                </p>
              ) : (
                <>
                  <div className="relative mt-2">
                    <div className="max-h-52 overflow-y-auto p-2 pb-6 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 dark:text-white">
                      <p>{docData?.intro}</p>
                    </div>
                    {/* Fixed gradient overlay */}
                    <div className="pointer-events-none absolute bottom-0 left-0 w-full h-6 rounded-b bg-gradient-to-t from-gray-100 dark:from-gray-700 to-transparent" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center italic">
                    Scroll to read more
                  </p>
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => setShowFullIntro(false)}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Collapse
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {/* Current Owner Section */}
        <h3 className="text-lg underline">Current Owner:</h3>
        {currentOwner ? (
          <div className="mb-4">
            <p className="font-medium">{currentOwner.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assigned on:{" "}
              {new Date(currentOwner.dateGiven).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p className="mb-4">No current owner assigned.</p>
        )}
        {/* Toggle Button for Previous Owners */}
        {previousOwners.length > 0 && (
          <button
            onClick={() => setShowPreviousOwners(!showPreviousOwners)}
            className="w-full bg-gray-500 text-white px-3 py-1 rounded mb-2"
          >
            {showPreviousOwners
              ? "Hide Previous Owners"
              : "Show Previous Owners"}
          </button>
        )}
        {/* Previous Owners (Hidden by Default) */}
        {/* Show Previous Owners (Hidden by Default) */}
        {showPreviousOwners && previousOwners.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">Previous Owners:</h3>
            <div className="space-y-3">
              {previousOwners.slice(0, 4).map((owner, index) => (
                <div
                  key={index}
                  className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center space-x-2">
                    <span
                      className="font-medium truncate w-2/3"
                      title={owner.name}
                    >
                      {owner.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-1/3 text-right">
                      Assigned: {new Date(owner.dateGiven).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Move the "Show All Previous Owners" Button Inside */}
            {previousOwners.length > 4 && (
              <p
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-blue-600 dark:text-blue-400 cursor-pointer text-sm hover:underline text-center"
              >
                Show All Previous Owners
              </p>
            )}
          </div>
        ) : (
          showPreviousOwners && <p>No previous owners.</p>
        )}
        {/* Previous Owners Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80 max-h-[50vh]">
              <h2 className="text-xl font-bold mb-4">All Previous Owners</h2>

              {/* Scrollable List of All Owners */}
              <ul className="space-y-3 max-h-[30vh] overflow-y-auto border border-gray-400 dark:border-gray-600 rounded-lg p-2">
                {previousOwners.map((owner, index) => (
                  <li
                    key={index}
                    className="p-3 border-b border-gray-300 dark:border-gray-700"
                  >
                    <span className="font-medium">{owner.name}</span>
                    <br />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Assigned on:{" "}
                      {new Date(owner.dateGiven).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-gray-300 dark:from-gray-700 to-transparent"></div>

              {/* Close Modal Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
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
