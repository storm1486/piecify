// components/MyFilesSection.jsx
"use client";

import Link from "next/link";

export default function MyFilesSection({ myFiles = [], previousFiles = [] }) {
  return (
    <div>
      {myFiles?.length > 0 ? (
        <ul className="space-y-4">
          {myFiles
            .slice()
            .sort((a, b) =>
              (a?.fileName || "").localeCompare(b?.fileName || "")
            )
            .map((file, index) => (
              <li
                key={index}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Link
                  href={`/viewFile/${file.fileId}`}
                  className="flex justify-between items-center"
                >
                  <span>{file.fileName}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {file.dateGiven
                      ? new Date(file.dateGiven).toLocaleDateString()
                      : "No Date"}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No files found.</p>
      )}

      {/* Previous Pieces Section */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">Previous Pieces</h2>
      {previousFiles?.length > 0 ? (
        <ul className="space-y-4">
          {previousFiles.map((file, index) => (
            <li
              key={index}
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Link
                href={`/viewFile/${file.fileId}`}
                className="flex justify-between items-center"
              >
                <span>{file.fileName || "Unnamed File"}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {file.dateGiven
                    ? new Date(file.dateGiven).toLocaleDateString()
                    : "No Date"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          No previous pieces found.
        </p>
      )}
    </div>
  );
}
