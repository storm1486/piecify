"use client";

const FileCard = ({ file, onClick, showOwner = false, ownerName = "" }) => (
  <div
    className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <span className="font-bold text-left w-full line-clamp-2 mb-2">
        {file.fileName}
      </span>

      {/* Display file length as badge */}
      {file.length && (
        <div className="ml-2 px-2 py-1 bg-blue-500 text-xs font-semibold rounded-full whitespace-nowrap text-white">
          {file.length}
        </div>
      )}
    </div>

    {/* Display file tags if they exist */}
    {file.attributes && file.attributes.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {file.attributes.map((tag) => (
          <span
            key={tag}
            className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    )}

    {/* Show owner information if requested */}
    {showOwner && (
      <div className="mt-2 text-sm text-gray-500 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        {ownerName || "Loading..."}
      </div>
    )}
  </div>
);

export default FileCard;
