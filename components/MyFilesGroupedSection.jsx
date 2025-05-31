// components/MyFilesGroupedSection.jsx
"use client";

import MyFilesSection from "./MyFilesSection";

export default function MyFilesGroupedSection({
  myFiles = [],
  previousFiles = [],
  requestedFiles = [],
}) {
  return (
    <div className="space-y-12">
      {myFiles.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className=" text-lg font-semibold text-gray-900 mb-2">
            Current Pieces
          </h3>
          <MyFilesSection myFiles={myFiles} />
        </div>
      )}

      {requestedFiles.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Requested Pieces
          </h3>
          <MyFilesSection requestedFiles={requestedFiles} />
        </div>
      )}

      {previousFiles.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Previous Pieces
          </h3>
          <MyFilesSection previousFiles={previousFiles} />
        </div>
      )}
    </div>
  );
}
