"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";
import PieceDetails from "@/components/PieceDetails";

export default function ViewFile() {
  const { folderId, fileId } = useParams();
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPieceDetailsOpen, setIsPieceDetailsOpen] = useState(false);
  const { user, setUser } = useUser();
  const [isMenu2Open, setIsMenu2Open] = useState(false);
  const menu2Ref = useRef(null);
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

  const handleOpenPieceDetails = () => {
    setIsPieceDetailsOpen(true);
    setIsMenuOpen(false);
    setIsMenu2Open(false);
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
        <PieceDetails
          fileId={fileId}
          onClose={() => setIsPieceDetailsOpen(false)}
        />
      )}
    </main>
  );
}
