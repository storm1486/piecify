"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";

export default function ViewFile() {
  const { fileId } = useParams();
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPieceDetailsOpen, setIsPieceDetailsOpen] = useState(false);
  const [previousOwners, setPreviousOwners] = useState([]);
  const { user } = useUser();
  const currentUserId = user?.uid;

  // Dropdown state and ref for closing menu on outside click
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchFile = async () => {
      if (!currentUserId) {
        console.error("User ID is not available");
        return;
      }

      try {
        setIsLoading(true);
        const userDocRef = doc(db, "users", currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const file = userData.myFiles?.find((f) => f.fileId === fileId);
          if (file) {
            setDocData(file);
          } else {
            console.error("No such file found in user's myFiles!");
          }
        } else {
          console.error("No such user document!");
        }
      } catch (error) {
        console.error("Error fetching file:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserId) {
      fetchFile();
    }
  }, [currentUserId, fileId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
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

  console.log(docData);

  const handleOpenPieceDetails = async () => {
    await fetchPreviousOwners();
    setIsPieceDetailsOpen(true);
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

  const fileExtension = docData.fileName.split(".").pop().toLowerCase();
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
      <div className="mt-20 w-full flex-grow flex items-center justify-center">
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
            <h2 className="text-xl font-bold mb-4">Piece Details</h2>

            {/* Piece Description */}
            <p className="mb-4">
              <strong>Description:</strong> {docData.pieceDescription}
            </p>

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
