"use client";

import { useEffect, useRef, useState } from "react";

export default function FileSearchSelect({
  files,
  onSelect,
  label = "Select File",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const justSelected = useRef(false); // 🚨 This is the key

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false; // Reset it
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredFiles([]);
      setShowDropdown(false);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const matches = files.filter((file) =>
      file.fileName.toLowerCase().includes(searchLower)
    );
    setFilteredFiles(matches);
    setShowDropdown(true);
  }, [searchQuery, files]);

  const handleSelect = (file) => {
    justSelected.current = true; // ✅ Prevent next effect from reopening dropdown
    setSearchQuery(file.fileName);
    setShowDropdown(false);
    onSelect(file.id, file);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 100);
  };

  return (
    <div className="mb-4 relative">
      <label className="block mb-2 text-lg font-medium">{label}</label>
      <input
        type="text"
        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        placeholder="Search for a file..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (filteredFiles.length > 0) setShowDropdown(true);
        }}
        onBlur={handleBlur}
      />
      {showDropdown && filteredFiles.length > 0 && (
        <ul className="absolute w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
          {filteredFiles.map((file) => (
            <li
              key={file.id}
              className={`p-2 flex justify-between items-center ${
                file.currentOwner?.length > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (file.currentOwner && file.currentOwner.length > 0) return;
                handleSelect(file);
              }}
            >
              <span>{file.fileName}</span>
              {file.currentOwner && file.currentOwner.length > 0 && (
                <span className="text-xs text-red-500 ml-2">
                  Already assigned
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {showDropdown &&
        searchQuery.trim() !== "" &&
        filteredFiles.length === 0 && (
          <div className="absolute w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 p-2 text-center text-gray-500 dark:text-gray-400 z-50 italic">
            No such file found.
          </div>
        )}
    </div>
  );
}
