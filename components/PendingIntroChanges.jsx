// components/PendingIntroChangesPanel.jsx
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/app/firebase/firebase";

export default function PendingIntroChangesPanel({ onFileClick }) {
  const [pendingChanges, setPendingChanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const filesRef = collection(db, "files");
    const q = query(filesRef, where("pendingIntroChange", "!=", null));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const changes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingChanges(changes);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <h2 className="text-xl font-semibold mb-4 mt-10">
        Pending Intro Changes
      </h2>

      {isLoading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : pendingChanges.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No pending changes</p>
      ) : (
        <ul className="space-y-4">
          {pendingChanges.map((file) => (
            <li
              key={file.id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onFileClick(file)}
            >
              <p className="font-medium truncate">{file.fileName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {file.pendingIntroChange?.newIntro}
              </p>
              <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">
                Submitted:{" "}
                {new Date(
                  file.pendingIntroChange?.timestamp
                ).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
