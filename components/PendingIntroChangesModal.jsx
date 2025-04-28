"use client";

import { useState } from "react";
import ChangesModal from "@/components/ChangesModal";

export default function PendingIntroChangesModal({
  pendingFiles,
  setPendingFiles,
  onClose,
  refreshPendingChanges,
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  if (!pendingFiles) return null;

  const handleAfterAction = async (fileId) => {
    await refreshPendingChanges();
    setSelectedFile(null);
    if (pendingFiles.length === 1) {
      onClose();
    }
  };

  return (
    <>
      {!selectedFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-semibold mb-4">
              Pending Intro Changes
            </h2>

            {pendingFiles.length > 0 ? (
              <div className="space-y-4">
                {pendingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-gray-100 dark:bg-gray-700 p-4 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    <p className="font-semibold">{file.fileName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Proposed By: {file.pendingIntroChange.proposedBy}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                No changes are pending for approval.
              </p>
            )}

            <div className="flex justify-end mt-6">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ChangesModal
          file={selectedFile}
          onClose={() => handleAfterAction(selectedFile.id)}
        />
      )}
    </>
  );
}
