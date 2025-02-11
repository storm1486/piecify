"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";

export default function ViewFile() {
  const { folderId, fileId } = useParams();
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPieceDetailsOpen, setIsPieceDetailsOpen] = useState(false);
  const [previousOwners, setPreviousOwners] = useState([]);
  const { user, setUser } = useUser();
  const currentUserId = user?.uid;
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isMenu2Open, setIsMenu2Open] = useState(false);
  const menu2Ref = useRef(null);

  useEffect(() => {
    if (docData && docData.pieceDescription !== undefined) {
      setNewDescription(docData.pieceDescription);
    }
  }, [docData]);

  // Dropdown state and ref for closing menu on outside click
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user && fileId) {
      const file = user.myFiles.find((f) => f.id === fileId);
      if (file) {
        setDocData(file);
      } else {
        console.error("File not found in user's myFiles!");
      }
      setIsLoading(false);
    }
  }, [user, fileId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (menu2Ref.current && !menu2Ref.current.contains(event.target)) {
        setIsMenu2Open(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPreviousOwners = async () => {
    if (!docData?.previouslyOwned?.length) {
      setPreviousOwners([]);
      return;
    }

    try {
      const ownerDetails = await Promise.all(
        docData.previouslyOwned.map(async (owner) => {
          const userRef = doc(db, "users", owner.userId);
          const userSnap = await getDoc(userRef);
          return {
            name: userSnap.exists()
              ? userSnap.data().name || userSnap.data().email
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

  console.log("docData", docData);

  const handleOpenPieceDetails = async () => {
    await fetchPreviousOwners();
    setIsPieceDetailsOpen(true);
  };

  const handleUpdateDescription = async () => {
    try {
      if (!fileId) {
        throw new Error("File ID is missing in the URL!");
      }

      const topLevelFileRef = doc(db, "files", fileId);

      // Update the file in Firestore
      await updateDoc(topLevelFileRef, { pieceDescription: newDescription });

      console.log("Top-level file description updated.");

      // Ensure local state updates with the latest changes
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!docData) {
    return <p>File not found!</p>;
  }

  const fileExtension = docData?.fileName?.includes(".")
    ? docData.fileName.split(".").pop().toLowerCase()
    : "";
  const supportedExtensions = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
  ];

  const handleViewFull = () => {
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
      docData.fileUrl
    )}&embedded=false`;
    window.open(viewerUrl, "_blank");
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-4 pt-20">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center bg-gray-200 dark:bg-gray-800 p-4 shadow-md z-10">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back to Files
        </button>
        <h1 className="text-xl font-bold text-center">{docData.fileName}</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleViewFull}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Edit/Print
          </button>

          {/* Ellipsis Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              {/* Vertical Ellipsis Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-6 h-6 text-gray-700 dark:text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.25a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 shadow-lg rounded-lg z-20">
                <ul className="py-2 text-gray-800 dark:text-white">
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => {
                      setIsMenuOpen(false);
                      alert("Version History Clicked");
                    }}
                  >
                    Version History
                  </li>
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => {
                      setIsMenuOpen(false);
                      alert("Track Record Clicked");
                    }}
                  >
                    Track Record
                  </li>
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleOpenPieceDetails();
                    }}
                  >
                    Piece Details
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Document Viewer */}
      <div className="w-full flex-grow flex items-center justify-center">
        {fileExtension === "pdf" ? (
          <iframe
            src={docData.fileUrl}
            className="w-full h-[calc(100vh-80px)]"
            title={docData.fileName}
            onLoad={() => setIsLoading(false)}
          />
        ) : supportedExtensions.includes(fileExtension) ? (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              docData.fileUrl
            )}&embedded=true`}
            className="w-full h-[calc(100vh-80px)]"
            title={docData.fileName}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div>
            <p>
              Preview is not available for this file type. You can download it
              below.
            </p>
            <a
              href={docData.fileUrl}
              className="text-blue-600 underline"
              download
            >
              Download {docData.fileName}
            </a>
          </div>
        )}
      </div>

      {isPieceDetailsOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Piece Details</h2>

              {/* Show Admin Menu if User is Admin */}
              {user?.role === "admin" && (
                <div className="relative" ref={menu2Ref}>
                  <button
                    onClick={() => setIsMenu2Open(!isMenu2Open)}
                    className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                  >
                    {/* Vertical Ellipsis Icon */}
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

                  {/* Admin Dropdown Menu */}
                  {isMenu2Open && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-lg z-30">
                      <ul className="py-2 text-gray-800 dark:text-white">
                        <li
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          onClick={() => {
                            setIsMenu2Open(false);
                            setIsEditingDescription(true);
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

            {/* Piece Description */}
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
                      onClick={async () => await handleUpdateDescription()}
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <p>{docData.pieceDescription || "No description provided."}</p>
              )}
            </div>

            {/* Previous Owners */}
            <h3 className="text-lg font-semibold mb-2">Previous Owners:</h3>
            {previousOwners.length > 0 ? (
              <ul className="list-disc pl-4">
                {previousOwners.map((owner, index) => (
                  <li key={index}>
                    <span className="font-medium">{owner.name}</span>
                    <br />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Assigned on:{" "}
                      {new Date(owner.dateGiven).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No previous owners.</p>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsPieceDetailsOpen(false)}
              className="mt-6 w-full bg-blue-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
