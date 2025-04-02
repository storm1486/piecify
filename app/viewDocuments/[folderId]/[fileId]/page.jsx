"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";
import PieceDetails from "@/components/PieceDetails";
import OtherVersions from "@/components/OtherVersions";
import { generateShareLink } from "../../../util/shareFile";
import { useUser } from "@/src/context/UserContext";
import ShareLinkModal from "@/components/ShareModal";
import {
  Mars,
  Venus,
  Users,
  Smile,
  Drama,
  Feather,
  Sparkles,
  HelpCircle,
  Laugh,
  ScrollText,
  Baby,
  BookOpenText,
  BookHeart,
  Speech,
} from "lucide-react";
import DocumentTags from "@/src/componenets/DocumentTags";

export default function ViewDocument() {
  const { folderId, fileId } = useParams(); // Retrieve folderId and fileId from URL
  const { user } = useUser();
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Track loading state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isMenu2Open, setIsMenu2Open] = useState(false);
  const menu2Ref = useRef(null);
  const [isPieceDetailsOpen, setIsPieceDetailsOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  const attributeIcons = {
    Boy: Mars,
    Girl: Venus,
    HI: Laugh,
    DI: Drama,
    DUO: Users,
    POI: BookOpenText,
    CL: Baby,
    STORYTELLING: ScrollText,
    NR: BookHeart,
    DEC: Speech,
    POETRY: Feather,
    PROSE: Sparkles,
    "NOVICE FRIENDLY": Smile,
  };

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

  const handleShare = async () => {
    if (!user || user.role !== "admin") {
      alert("Only admins can share files.");
      return;
    }

    const link = await generateShareLink(fileId, user);
    if (link) {
      setShareLink(link);
      setIsShareModalOpen(true); // Open modal after generating the link
    }
  };

  const handleOpenPieceDetails = () => {
    setIsPieceDetailsOpen(true);
    setIsMenuOpen(false); // ✅ Close menu
    setIsMenu2Open(false); // ✅ Close second menu
  };

  useEffect(() => {
    const fetchDocument = async () => {
      if (folderId && fileId) {
        try {
          setIsLoading(true); // Start loading spinner

          // Step 1: Fetch file reference from the folder
          const folderFileRef = doc(db, "folders", folderId, "files", fileId);
          const folderFileSnap = await getDoc(folderFileRef);

          if (folderFileSnap.exists()) {
            const folderFileData = folderFileSnap.data();
            const fileRefPath = folderFileData.fileRef; // Get the reference path to the top-level file

            if (fileRefPath) {
              // Step 2: Fetch actual file data from the top-level 'files' collection
              const fileDocRef = doc(db, fileRefPath);
              const fileDocSnap = await getDoc(fileDocRef);

              if (fileDocSnap.exists()) {
                setDocData(fileDocSnap.data()); // Set the fetched file data
              } else {
                console.error("No such file document in top-level collection!");
              }
            } else {
              console.error("No fileRef found in folder document!");
            }
          } else {
            console.error("No such document in folder!");
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        } finally {
          setIsLoading(false); // Stop loading spinner
        }
      }
    };

    fetchDocument();
  }, [folderId, fileId]);

  const handleOpenVersionsModal = () => setIsVersionsModalOpen(true);
  const handleCloseVersionsModal = () => setIsVersionsModalOpen(false);

  // Loading Spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // Handle document not found
  if (!docData) {
    return <p>Document not found!</p>;
  }

  const handleViewFull = () => {
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
      docData.fileUrl
    )}&embedded=false`;
    window.open(viewerUrl, "_blank"); // Open full Google Docs Viewer
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen pt-20">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full bg-gray-200 dark:bg-gray-800 shadow-md z-10">
        <div className="flex justify-between items-center p-4">
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
            {user?.role === "admin" && (
              <button
                onClick={handleShare}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Share
              </button>
            )}
            {/* Ellipsis menu */}
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
                        handleOpenVersionsModal();
                      }}
                    >
                      Edited Versions
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
        </div>

        {/* 👇 Tags container right below the header content */}
        <DocumentTags attributes={docData.attributes} />
      </header>

      {/* Document Viewer */}
      <div className="w-full flex-grow flex items-center justify-center mt-10">
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(
            docData.fileUrl
          )}&embedded=true`}
          className="w-full h-[calc(100vh-80px)]"
          title={docData.fileName}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {isPieceDetailsOpen && (
        <PieceDetails
          fileId={fileId}
          onClose={() => setIsPieceDetailsOpen(false)}
        />
      )}
      {isVersionsModalOpen && (
        <OtherVersions
          fileId={fileId}
          isOpen={isVersionsModalOpen}
          onClose={handleCloseVersionsModal}
        />
      )}
      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareLink={shareLink}
      />
    </main>
  );
}
