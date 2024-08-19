"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebase"; // Adjust the path as necessary
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Documents() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const userId = "user's-uid"; // Replace with actual user ID
      const q = query(collection(db, "uploads"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(docs);
    };

    fetchDocuments();
  }, []);

  return (
    <main className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 p-4 flex flex-col">
        <Link href="/" passHref>
          <button className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
            Home
          </button>
        </Link>

        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <ul className="space-y-2 flex-1 overflow-y-auto">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <li key={doc.id} className="bg-white p-2 rounded shadow-sm">
                <Link href={`/viewDocuments/${doc.id}`} passHref>
                  <span className="text-blue-600 underline block truncate cursor-pointer">
                    {doc.fileName}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <p className="text-gray-600">No documents uploaded yet.</p>
          )}
        </ul>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4">Documents Page</h1>
        <p>This is where users can manage their documents.</p>

        {/* Add any other main content here */}
      </section>
    </main>
  );
}
