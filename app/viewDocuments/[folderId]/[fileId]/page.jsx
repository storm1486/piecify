"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import PieceDetails from "@/components/PieceDetails";
import OtherVersions from "@/components/OtherVersions";
import { generateShareLink } from "../../../util/shareFile";
import { useUser } from "@/src/context/UserContext";
import ShareLinkModal from "@/components/ShareModal";
import DocumentTags from "@/src/componenets/DocumentTags";
import { useLayout } from "@/src/context/LayoutContext";
import { useOrganization } from "../../../../src/context/OrganizationContext";
import { getOrgDoc } from "../../../../src/utils/firebaseHelpers";

export default function ViewDocument() {
  const { folderId, fileId } = useParams();
  const { user, isPrivileged } = useUser();
  const isPrivilegedUser = isPrivileged();
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isPieceDetailsOpen, setIsPieceDetailsOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const { setCustomNavButtons } = useLayout();
  const { orgId } = useOrganization();

  useEffect(() => {
    setCustomNavButtons([
      {
        label: "Back to Folder",
        onClick: () => router.push(`/folders/${folderId}`),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 md:h-6 md:w-6 text-blue-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        ),
      },
    ]);
    return () => {
      setCustomNavButtons([]); // Clean up when leaving the page
    };
  }, []);

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

  const handleShare = async () => {
    if (!user || !isPrivilegedUser) {
      alert("Only admins can share files.");
      return;
    }

    try {
      const link = await generateShareLink({ orgId, fileId, user });
      setShareLink(link);
      setIsShareModalOpen(true);
    } catch (e) {
      console.error("Failed to generate share link:", e);
      alert("Failed to generate share link.");
    }
  };

  const handleOpenPieceDetails = () => {
    setIsPieceDetailsOpen(true);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const fetchDocument = async () => {
      if (folderId && fileId) {
        try {
          setIsLoading(true);

          // We already know the fileId; just read it directly from org-scoped 'files'
          const fileDocRef = getOrgDoc(orgId, "files", fileId);
          const fileDocSnap = await getDoc(fileDocRef);
          if (fileDocSnap.exists()) {
            setDocData(fileDocSnap.data());
          } else {
            console.error("No such file document in org files!");
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDocument();
  }, [folderId, fileId]);

  const handleOpenVersionsModal = () => setIsVersionsModalOpen(true);
  const handleCloseVersionsModal = () => setIsVersionsModalOpen(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500"></div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Document not found
          </h3>
          <p className="text-gray-500 mb-4">
            The requested document could not be located
          </p>
          <button
            onClick={() => router.back()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleViewFull = () => {
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
      docData.fileUrl
    )}&embedded=false`;
    window.open(viewerUrl, "_blank");
  };

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-sm p-4 z-10"
        >
          <div className="flex items-center justify-between">
            {/* File Title and Info */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {docData.fileName}
                </h1>
                <p className="text-sm text-gray-500">
                  {docData.fileName.endsWith(".pdf")
                    ? "PDF Document"
                    : docData.fileName.endsWith(".mp3")
                    ? "Audio File"
                    : "Document"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleViewFull}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit/Print
              </button>

              {isPrivilegedUser && (
                <button
                  onClick={handleShare}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                  Share
                </button>
              )}

              {/* Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-20 border border-gray-200"
                  >
                    <ul className="py-2">
                      <li>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleOpenVersionsModal();
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Edited Versions
                        </button>
                      </li>
                      {/* <li>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          onClick={() => {
                            setIsMenuOpen(false);
                            alert("Track Record Clicked");
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          Track Record
                        </button>
                      </li> */}
                      <li>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleOpenPieceDetails();
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Piece Details
                        </button>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Document Tags */}
          <div className="mt-4">
            <DocumentTags
              attributes={docData.attributes}
              fileId={fileId}
              isPrivilegedUser={isPrivilegedUser}
            />
          </div>
        </motion.header>

        {/* Document Viewer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 p-4 overflow-hidden"
        >
          <div className="h-full bg-white rounded-lg shadow-sm overflow-hidden">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(
                docData.fileUrl
              )}&embedded=true`}
              className="w-full h-full border-0"
              title={docData.fileName}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </motion.div>
      </main>

      {/* Modals */}
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
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareLink={shareLink}
      />
    </div>
  );
}
