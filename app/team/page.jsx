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
    setActivePage("team");
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
            const yearA = a.graduationYear ?? 9999;
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
      return {
        label: "Freshman",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    if (diff === 3)
      return {
        label: "Sophomore",
        color: "bg-blue-100 text-blue-700 border-blue-200",
      };
    if (diff === 2)
      return {
        label: "Junior",
        color: "bg-purple-100 text-purple-700 border-purple-200",
      };
    if (diff <= 1 && diff >= 0)
      return {
        label: "Senior",
        color: "bg-amber-100 text-amber-700 border-amber-200",
      };
    if (diff > 4)
      return {
        label: "Middle School",
        color: "bg-pink-100 text-pink-700 border-pink-200",
      };
  }

  const filteredUsers = users
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
      const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
      const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.toLowerCase();
      return alphaSort === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 text-gray-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto h-screen">
        {/* Enhanced Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 p-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Team Members
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Manage your team and their access levels
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  {filteredUsers.length} members
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Enhanced Filters Section */}
          <div className="mb-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Filter & Sort
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredUsers.length} of {users.length} members shown
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Class Year
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="all">All Years</option>
                    <option value="Middle School">Middle School</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sort Order
                  </label>
                  <select
                    value={alphaSort}
                    onChange={(e) => setAlphaSort(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Assignment
                  </label>
                  <select
                    value={assignmentFilter}
                    onChange={(e) => setAssignmentFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="all">All Members</option>
                    <option value="assigned">Has Assignments</option>
                    <option value="unassigned">No Assignments</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Attributes
                  </label>
                  <select
                    value={attributeFilter}
                    onChange={(e) => setAttributeFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="all">All Attributes</option>
                    {sortedAttributeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/50 hover:border-gray-300/50 hover:-translate-y-1"
              >
                {/* Enhanced top accent */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      {/* Enhanced avatar */}
                      <div className="relative">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {u.firstName
                            ? u.firstName.charAt(0)
                            : u.email.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div className="flex-1">
                        <Link href={`/user-documents/${u.id}`}>
                          <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-lg group-hover:text-blue-600">
                            {u.firstName && u.lastName
                              ? `${u.firstName} ${u.lastName}`
                              : u.email}
                          </h3>
                        </Link>

                        <div className="flex items-center mt-2 space-x-2">
                          {/* Enhanced role badge */}
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium border ${
                              u.role === "admin"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {u.role === "admin" ? "Admin" : "Member"}
                          </span>

                          {/* Enhanced class year badge */}
                          {u.graduationYear &&
                            (() => {
                              const { label, color } = getClassYearInfo(
                                u.graduationYear
                              );
                              return (
                                <span
                                  className={`text-xs px-3 py-1 rounded-full font-medium border ${color}`}
                                >
                                  {label}
                                </span>
                              );
                            })()}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced admin controls */}
                    {user?.role === "admin" && u.id !== user?.uid && (
                      <div className="relative dropdown-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === u.id ? null : u.id);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100/50 transition-all duration-200 group-hover:text-gray-600"
                        >
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {menuOpen === u.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg py-2 z-50 dropdown-menu border border-gray-200/50">
                            <button
                              onClick={() => toggleAdminRole(u.id, u.role)}
                              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100/50 flex items-center transition-colors duration-200"
                            >
                              {u.role === "admin" ? (
                                <>
                                  <svg
                                    className="h-4 w-4 mr-3 text-red-500"
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
                                  Remove Admin
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="h-4 w-4 mr-3 text-green-500"
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

                  {/* Enhanced assignment info */}
                  <div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg
                        className="h-4 w-4 mr-2"
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
                      {u.myFiles?.length || 0} assigned documents
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No team members found
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
