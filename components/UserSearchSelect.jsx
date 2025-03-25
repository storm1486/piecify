"use client";

import { useEffect, useRef, useState } from "react";

export default function UserSearchSelect({
  users,
  onSelect,
  label = "Select User",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const justSelected = useRef(false); // ✅ Skip effect right after selection

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredUsers([]);
      setShowDropdown(false);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const matches = users.filter(
      (user) =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
    );
    setFilteredUsers(matches);
    setShowDropdown(true);
  }, [searchQuery, users]);

  const handleSelect = (user) => {
    justSelected.current = true; // ✅ Prevent dropdown logic from running
    setSearchQuery(`${user.firstName} ${user.lastName}`);
    setFilteredUsers([]);
    setShowDropdown(false);
    onSelect(user.id, user);
  };

  return (
    <div className="mb-4 relative">
      <label className="block mb-2 text-lg font-medium">{label}</label>
      <input
        type="text"
        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        placeholder="Search for a user..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (filteredUsers.length > 0) setShowDropdown(true);
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 100)} // ✅ close on click-away
      />
      {showDropdown && filteredUsers.length > 0 && (
        <ul className="absolute w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
          {filteredUsers.map((user) => (
            <li
              key={user.id}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onMouseDown={(e) => e.preventDefault()} // ✅ prevent blur before click
              onClick={() => handleSelect(user)}
            >
              {`${user.firstName} ${user.lastName}`}{" "}
              <span className="text-xs text-gray-500">({user.email})</span>
            </li>
          ))}
        </ul>
      )}
      {showDropdown &&
        searchQuery.trim() !== "" &&
        filteredUsers.length === 0 && (
          <div className="absolute w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg mt-1 p-2 text-center text-gray-500 dark:text-gray-400 z-50 italic">
            No such user found.
          </div>
        )}
    </div>
  );
}
