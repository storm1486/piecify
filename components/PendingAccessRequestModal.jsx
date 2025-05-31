import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../app/firebase/firebase"; // Adjust path as needed

export default function PendingAccessRequestsModal({
  pendingRequests,
  setPendingRequests,
  onClose,
  refreshPendingRequests,
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Function to handle approval/rejection
  const handleRequestAction = async (fileId, userId, action) => {
    try {
      setLoading(true);
      setMessage(null);

      const fileRef = doc(db, "files", fileId);
      const fileDoc = await getDoc(fileRef);

      if (!fileDoc.exists()) {
        setMessage({ type: "error", text: "File not found" });
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

      // If approved, add file to user's requestedFiles
      if (action === "approved") {
        // 🔍 Find the actual request object for this user
        const matchedRequest = accessRequests.find(
          (r) => r.userId === userId && r.status === "pending"
        );

        if (!matchedRequest) {
          throw new Error("Matching request not found or already handled.");
        }

        if (matchedRequest.requestType === "assign") {
          // Assignment: Add user to currentOwner
          const currentOwner = fileData.currentOwner || [];
          await updateDoc(fileRef, {
            currentOwner: [
              ...currentOwner,
              {
                userId: userId,
                dateGiven: new Date().toISOString(),
              },
            ],
          });
        } else {
          // View: Add to user's requestedFiles
          const userRef = doc(db, "users", userId);
          const fileEntry = {
            fileRef: fileRef,
            dateGiven: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          };
          await updateDoc(userRef, {
            requestedFiles: arrayUnion(fileEntry),
          });
        }
      }

      // Remove request from UI
      setPendingRequests((prev) =>
        prev.filter((req) => !(req.fileId === fileId && req.userId === userId))
      );

      setMessage({
        type: "success",
        text: `Request ${
          action === "approved" ? "approved" : "declined"
        } successfully`,
      });

      // Refresh all pending requests
      if (refreshPendingRequests) {
        refreshPendingRequests();
      }
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      setMessage({
        type: "error",
        text: `Failed to ${action} request. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Pending Access Requests
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {pendingRequests.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Piece Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Requested By
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Request Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map((request) => (
                  <tr key={request.requestId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600">
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
                        <div className="text-sm font-medium text-gray-900">
                          {request.fileName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.requestDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.requestType === "assign" ? "Assignment" : "View"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {/* Approve button only shown if request is not for assign OR there are no current owners */}

                        <button
                          onClick={() =>
                            handleRequestAction(
                              request.fileId,
                              request.userId,
                              "approved"
                            )
                          }
                          disabled={loading}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>

                        {/* Always show Decline */}
                        <button
                          onClick={() =>
                            handleRequestAction(
                              request.fileId,
                              request.userId,
                              "rejected"
                            )
                          }
                          disabled={loading}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No pending access requests.</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
