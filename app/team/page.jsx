"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useUser } from "@/src/context/UserContext";
import { useLayout } from "@/src/context/LayoutContext";
import { sortedAttributeOptions } from "@/src/componenets/AttributeIcons";

export default function CurrentTeam() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const { user } = useUser();
  const { setActivePage } = useLayout();
  const [yearFilter, setYearFilter] = useState("all");
  const [alphaSort, setAlphaSort] = useState("asc");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [attributeFilter, setAttributeFilter] = useState("all");
  const [fileDataMap, setFileDataMap] = useState({});

  useEffect(() => {
    setActivePage("team"); // ✅ update current page
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => {
            const yearA = a.graduationYear ?? 9999; // Put missing years at bottom
            const yearB = b.graduationYear ?? 9999;
            return yearA - yearB;
          });
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchFileMetadata = async () => {
      const fileRefs = new Set();
      users.forEach((u) => {
        if (u.myFiles?.length) {
          u.myFiles.forEach((f) => {
            if (f?.fileRef?.id) fileRefs.add(f.fileRef.id);
          });
        }
      });

      const fileMap = {};
      await Promise.all(
        Array.from(fileRefs).map(async (fileId) => {
          const fileDoc = await getDoc(doc(db, "files", fileId));
          if (fileDoc.exists()) {
            fileMap[fileId] = fileDoc.data();
          }
        })
      );

      setFileDataMap(fileMap);
    };

    if (users.length > 0) fetchFileMetadata();
  }, [users]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleAdminRole = async (userId, currentRole) => {
    try {
      const userRef = doc(db, "users", userId);
      const newRole = currentRole === "admin" ? "user" : "admin";

      await updateDoc(userRef, { role: newRole });

      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      console.log(`User ${userId} role updated to ${newRole}.`);
      setMenuOpen(null);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  function getClassYearInfo(graduationYear) {
    const currentYear = new Date().getFullYear();
    const diff = graduationYear - currentYear;

    if (diff === 4)
      return { label: "Freshman", color: "bg-gray-200 text-gray-800" };
    if (diff === 3)
      return { label: "Sophomore", color: "bg-gray-600 text-white" };
    if (diff === 2)
      return { label: "Junior", color: "bg-blue-100 text-blue-800" };
    if (diff <= 1 && diff >= 0)
      return { label: "Senior", color: "bg-red-100 text-red-800" };
    if (diff > 4)
      return { label: "Middle School", color: "bg-purple-100 text-purple-800" };
    return { label: "Graduated", color: "bg-yellow-100 text-yellow-800" };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mainBg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-screen">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="text-gray-500">
                Manage your team and their access levels
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              All Team Members
            </h2>
            <p className="text-gray-500">
              View and manage team member permissions
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Years</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Middle School">Middle School</option>
              <option value="Graduated">Graduated</option>
            </select>

            {/* Alphabetical Sort */}
            <select
              value={alphaSort}
              onChange={(e) => setAlphaSort(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>

            {/* Assignment Filter */}
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="assigned">Assigned Pieces</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <select
              value={attributeFilter}
              onChange={(e) => setAttributeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Attributes</option>
              {sortedAttributeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Team grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users
              .filter((u) => {
                const { label } = getClassYearInfo(Number(u.graduationYear));

                if (yearFilter !== "all" && label !== yearFilter) return false;
                if (
                  assignmentFilter === "assigned" &&
                  (!u.myFiles || u.myFiles.length === 0)
                )
                  return false;
                if (
                  assignmentFilter === "unassigned" &&
                  u.myFiles &&
                  u.myFiles.length > 0
                )
                  return false;

                if (attributeFilter !== "all") {
                  const hasAttribute = (u.myFiles || []).some((f) => {
                    const fileId = f?.fileRef?.id;
                    const file = fileDataMap[fileId];
                    return file?.attributes?.includes(attributeFilter);
                  });

                  if (!hasAttribute) return false;
                }

                return true;
              })
              .sort((a, b) => {
                const nameA = `${a.firstName ?? ""} ${
                  a.lastName ?? ""
                }`.toLowerCase();
                const nameB = `${b.firstName ?? ""} ${
                  b.lastName ?? ""
                }`.toLowerCase();
                return alphaSort === "asc"
                  ? nameA.localeCompare(nameB)
                  : nameB.localeCompare(nameA);
              })
              .map((u) => (
                <div
                  key={u.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
                >
                  <div className="h-2 bg-blue-500"></div>
                  <div className="p-5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                          {u.firstName
                            ? u.firstName.charAt(0)
                            : u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link href={`/user-documents/${u.id}`}>
                            <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              {u.firstName && u.lastName
                                ? `${u.firstName} ${u.lastName}`
                                : u.email}
                            </h3>
                          </Link>
                          <div className="flex items-center mt-1 space-x-2">
                            <span
                              className={`text-sm px-2.5 py-0.5 rounded-full ${
                                u.role === "admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {u.role === "admin" ? "Admin" : "User"}
                            </span>

                            {u.graduationYear &&
                              (() => {
                                const { label, color } = getClassYearInfo(
                                  u.graduationYear
                                );
                                return (
                                  <span
                                    className={`text-sm px-2 py-0.5 rounded-full ${color}`}
                                  >
                                    {label}
                                  </span>
                                );
                              })()}
                          </div>
                        </div>
                      </div>

                      {/* Admin controls */}
                      {user?.role === "admin" && u.id !== user?.uid && (
                        <div className="relative dropdown-menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(menuOpen === u.id ? null : u.id);
                            }}
                            className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {menuOpen === u.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 dropdown-menu border border-gray-200">
                              <button
                                onClick={() => toggleAdminRole(u.id, u.role)}
                                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                {u.role === "admin" ? (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-2 text-red-500"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    Remove as Admin
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-2 text-green-500"
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
                                    Make Admin
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                      <Link href={`/user-documents/${u.id}`}>
                        <span className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          View documents
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
