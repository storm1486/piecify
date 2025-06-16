"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/src/context/UserContext"; // Add this import
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import PendingIntroChangesModal from "./PendingIntroChangesModal";
import PendingAccessRequestsModal from "./PendingAccessRequestModal";
import { db } from "@/app/firebase/firebase";
import { GrSort } from "react-icons/gr";
import { MdOutlinePageview } from "react-icons/md";
import { TbFileSmile } from "react-icons/tb";

export default function Sidebar({
  activePage = "dashboard",
  customButtons = [],
}) {
  // Use the useUser hook to get user and handleLogout directly
  const { user, handleLogout } = useUser();

  // State for admin modals
  const [pendingIntroFiles, setPendingIntroFiles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingIntroModal, setShowPendingIntroModal] = useState(false);
  const [showPendingRequestsModal, setShowPendingRequestsModal] =
    useState(false);

  // Fetch pending items when component mounts if user is admin
  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingIntroChanges();
      fetchPendingRequests();
    }
  }, [user]);

  // Handler functions for modals
  const handlePendingIntroClick = () => {
    setShowPendingIntroModal(true);
  };

  const handlePendingRequestsClick = () => {
    setShowPendingRequestsModal(true);
  };

  // Fetch functions for admin features
  const fetchPendingIntroChanges = async () => {
    try {
      const filesSnapshot = await getDocs(collection(db, "files"));
      const filesWithPendingChanges = filesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((file) => file.pendingIntroChange);

      setPendingIntroFiles(filesWithPendingChanges);
    } catch (error) {
      console.error("Error fetching pending intro changes:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const filesSnapshot = await getDocs(collection(db, "files"));
      const allRequests = [];

      for (const fileDoc of filesSnapshot.docs) {
        const fileData = fileDoc.data();
        if (fileData.accessRequests && Array.isArray(fileData.accessRequests)) {
          const fileRequests = fileData.accessRequests
            .filter(
              (request) => request.status === "pending" || !request.status
            )
            .map((request) => ({
              fileId: fileDoc.id,
              fileName: fileData.fileName,
              requestDate: request.requestedAt,
              userId: request.userId,
              userName: request.userName || "Unknown User",
              requestType: request.requestType || "view",
              requestId:
                request.userId + "-" + (request.requestedAt || Date.now()),
              currentOwners: fileData.currentOwner || [], // ✅ add this line
            }));

          allRequests.push(...fileRequests);
        }
      }

      setPendingRequests(allRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  // Function to handle approval/rejection of requests
  const handleRequestAction = async (fileId, userId, action) => {
    try {
      const fileRef = doc(db, "files", fileId);
      const fileDoc = await getDoc(fileRef);

      if (!fileDoc.exists()) {
        console.error("File not found");
        return;
      }

      const fileData = fileDoc.data();
      const accessRequests = fileData.accessRequests || [];

      // Find the specific request
      const updatedRequests = accessRequests.map((request) => {
        if (request.userId === userId) {
          return { ...request, status: action };
        }
        return request;
      });

      // Update the file document
      await updateDoc(fileRef, { accessRequests: updatedRequests });

      // If approved, add file to user's myFiles
      if (action === "approved") {
        const userRef = doc(db, "users", userId);
        const fileEntry = {
          fileRef: fileRef,
          dateGiven: new Date().toISOString(),
        };
        await updateDoc(userRef, {
          myFiles: arrayUnion(fileEntry),
        });
      }

      // Refresh the requests list
      fetchPendingRequests();
    } catch (error) {
      console.error(`Error ${action} request:`, error);
    }
  };

  return (
    <>
      <aside className="w-72 bg-blue-900 text-white p-6 flex flex-col h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Piece</span>
            <span className="text-blue-300">ify</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Your performances, organized.
          </p>
        </div>

        {/* User Profile */}
        {user ? (
          <div className="mb-8 bg-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user.firstName && user.firstName[0]}
                {user.lastName && user.lastName[0]}
              </div>
              <div>
                <p className="font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-blue-300">
                  {user.role === "admin" ? "Administrator" : "User"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout} // Use handleLogout from context
              className="mt-3 text-sm text-blue-300 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm mb-6 text-blue-300 hover:text-white"
          >
            Please log in to access your files.
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex-1">
          <div className="mb-4">
            <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider">
              Navigation
            </h3>
          </div>

          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className={`flex items-center p-2 rounded-md ${
                  activePage === "dashboard"
                    ? "bg-blue-800/50 font-medium"
                    : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/viewPieces"
                className={`flex items-center p-2 rounded-md ${
                  activePage === "viewPieces"
                    ? "bg-blue-800/50 font-medium"
                    : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
                }`}
              >
                <MdOutlinePageview className="mr-3 h-6 w-6" />
                View Pieces
              </Link>
            </li>
            {user && (
              <li>
                <Link
                  href="/myFiles"
                  className={`flex items-center p-2 rounded-md ${
                    activePage === "myFiles"
                      ? "bg-blue-800/50 font-medium"
                      : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
                  }`}
                >
                  <TbFileSmile className="mr-3 h-6 w-6" />
                  My Files
                </Link>
              </li>
            )}
            {user?.role === "admin" && (
              <>
                <li>
                  <Link
                    href="/allFolders"
                    className={`flex items-center p-2 rounded-md ${
                      activePage === "folders"
                        ? "bg-blue-800/50 font-medium"
                        : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-3"
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
                    All Folders
                  </Link>
                </li>
                <li>
                  <Link
                    href="/practiceSorter"
                    className={`flex items-center p-2 rounded-md ${
                      activePage === "practiceSorter"
                        ? "bg-blue-800/50 font-medium"
                        : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
                    }`}
                  >
                    <GrSort className="mr-3 h-6 w-6" />
                    Practice Sorter
                  </Link>
                </li>
              </>
            )}
          </ul>
          {/* Other Links */}
          <div className="mt-6">
            <Link
              href="/team"
              className={`flex items-center p-2 rounded-md ${
                activePage === "team"
                  ? "bg-blue-800/50 font-medium"
                  : "text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Current Team
            </Link>
          </div>
        </nav>

        {/* Admin Panel */}
        {user?.role === "admin" && (
          <div className="mt-6">
            <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider mb-4">
              Admin
            </h3>
            <div
              className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors cursor-pointer relative"
              onClick={handlePendingIntroClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>Pending Intro Changes</span>

              {/* Notification Badge */}
              {pendingIntroFiles?.length > 0 && (
                <span className="bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {pendingIntroFiles.length}
                </span>
              )}
            </div>

            {/* Add this new menu item */}
            <div
              className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors cursor-pointer relative mt-2"
              onClick={handlePendingRequestsClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span>Pending Access Requests</span>

              {/* Notification Badge */}
              {pendingRequests?.length > 0 && (
                <span className="bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </div>
          </div>
        )}

        {customButtons.length > 0 && (
          <div className="mt-2 space-y-2">
            {customButtons.map((button, index) => (
              <div
                key={index}
                onClick={button.onClick}
                className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors cursor-pointer relative"
              >
                {button.icon ? (
                  button.icon
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                )}
                <span>{button.label}</span>

                {/* Optional badge */}
                {button.badgeCount > 0 && (
                  <span className="bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                    {button.badgeCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 pt-4 border-t border-blue-800">
          <button className="text-sm text-blue-300 hover:text-white transition-colors flex items-center">
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Help &amp; Support
          </button>
        </div>
      </aside>

      {/* Include the modals inside the Sidebar component */}
      {showPendingIntroModal && (
        <PendingIntroChangesModal
          pendingFiles={pendingIntroFiles}
          setPendingFiles={setPendingIntroFiles}
          onClose={() => setShowPendingIntroModal(false)}
          refreshPendingChanges={fetchPendingIntroChanges}
        />
      )}

      {showPendingRequestsModal && (
        <PendingAccessRequestsModal
          pendingRequests={pendingRequests}
          setPendingRequests={setPendingRequests}
          onClose={() => setShowPendingRequestsModal(false)}
          refreshPendingRequests={fetchPendingRequests}
        />
      )}
    </>
  );
}
