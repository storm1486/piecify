"use client";
import Link from "next/link";

export default function MyFilesSection({
  myFiles = [],
  previousFiles = [],
  requestedFiles = [],
}) {
  return (
    <div>
      {/* === CURRENT PIECES === */}
      {myFiles.length > 0 && (
        <div>
          <ul className="divide-y divide-gray-200">
            {myFiles
              .slice()
              .sort((a, b) =>
                (a?.fileName || "").localeCompare(b?.fileName || "")
              )
              .map((file, index) => (
                <li key={index} className="p-4 hover:bg-gray-50">
                  <Link href={`/viewFile/${file.fileId}`} className="block">
                    {/* Your existing rendering for current pieces */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
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
                        <div className="ml-4 truncate">
                          <div className="text-sm font-medium text-gray-900">
                            {file.fileName || "Unnamed File"}
                          </div>
                          {file.originalFileName && (
                            <p className="text-xs italic text-gray-500">
                              This is your cutting of{" "}
                              <span className="font-medium">
                                {file.originalFileName}
                              </span>
                            </p>
                          )}
                          <div className="text-xs text-gray-500">
                            Added on{" "}
                            {file.dateGiven
                              ? new Date(file.dateGiven).toLocaleDateString()
                              : "Unknown date"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* === REQUESTED PIECES === */}
      {requestedFiles.length > 0 && (
        <div>
          <ul className="divide-y divide-gray-200">
            {requestedFiles.map((file, index) => (
              <li key={index} className="p-4 hover:bg-gray-50">
                <Link href={`/viewRequestedFile/${file.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
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
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4 truncate">
                        <div className="text-sm font-medium text-gray-900">
                          {file.fileName || "Unnamed File"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Requested:{" "}
                          {new Date(
                            file.requestDate || Date.now()
                          ).toLocaleDateString()}
                          {file.status && (
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                file.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : file.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {file.status.charAt(0).toUpperCase() +
                                file.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === PREVIOUS PIECES === */}
      {previousFiles.length > 0 && (
        <div className="mt-8">
          <ul className="divide-y divide-gray-200">
            {previousFiles.map((file, index) => (
              <li key={index} className="p-4 hover:bg-gray-50">
                <Link href={`/viewFile/${file.fileId}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4 truncate">
                        <div className="text-sm font-medium text-gray-900">
                          {file.fileName || "Unnamed File"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Previously owned on{" "}
                          {file.dateGiven
                            ? new Date(file.dateGiven).toLocaleDateString()
                            : "Unknown date"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
