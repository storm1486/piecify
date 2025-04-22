"use client";

import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import {
  attributeIcons,
  sortedAttributeOptions,
} from "@/src/componenets/AttributeIcons";
import { HelpCircle, Plus } from "lucide-react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../app/firebase/firebase";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "#1f2937",
    borderColor: state.isFocused ? "#4b5563" : "#374151",
    color: "#f3f4f6",
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : null,
    "&:hover": {
      borderColor: "#6b7280",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#1f2937",
    color: "#f3f4f6",
    zIndex: 20,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#2563eb" : "#1f2937",
    color: state.isFocused ? "#ffffff" : "#f3f4f6",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  }),

  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "mainBg",
    border: "1px solid #6b7280", // Tailwind's gray-500
    borderRadius: "0.375rem",
    padding: "0 4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#ffffff",
    fontSize: "0.875rem", // text-sm
    padding: "0 4px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#ffffff",
    ":hover": {
      backgroundColor: "#374151", // Tailwind's gray-700
      color: "#ffffff",
    },
  }),
  control: (base, state) => ({
    ...base,
    backgroundColor: "#1f2937",
    borderColor: state.isFocused ? "#4b5563" : "#374151",
    color: "#f3f4f6",
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : null,
    width: "100%", // ✅ Ensures it obeys parent div
    minWidth: "360px", // ✅ Enforced minimum width
    maxWidth: "360px", // ✅ Enforced maximum width
    minHeight: "2rem",
    "&:hover": {
      borderColor: "#6b7280",
    },
  }),
};

export default function DocumentTags({ attributes, fileId, isAdmin }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [latestAttributes, setLatestAttributes] = useState(attributes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLatestTags = async () => {
      if (isModalOpen && fileId) {
        const fileRef = doc(db, "files", fileId);
        const snap = await getDoc(fileRef);
        if (snap.exists()) {
          const data = snap.data();
          const attrs = data.attributes || [];
          setLatestAttributes(attrs); // update display tags
          setSelectedTags(attrs.map((tag) => ({ value: tag, label: tag }))); // update selector
        }
      }
    };

    fetchLatestTags();
  }, [isModalOpen, fileId]);

  const getTagOptionsFromLatest = () =>
    latestAttributes.map((tag) => ({ value: tag, label: tag }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const newAttributes = selectedTags.map((opt) => opt.value);

      // ✅ Save new attributes to Firestore
      await updateDoc(doc(db, "files", fileId), {
        attributes: newAttributes,
      });

      // ✅ Update local state so UI reflects changes
      setLatestAttributes(newAttributes); // for immediate UI update
      setIsModalOpen(false); // close the modal
    } catch (err) {
      console.error("Failed to update attributes:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedTags(getTagOptionsFromLatest());
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="w-full flex justify-center pb-2 mb-2 mt-2">
        <div className="flex flex-wrap items-center gap-2 px-4">
          {latestAttributes.map((tag, index) => {
            const Icon = attributeIcons[tag] || HelpCircle;
            return (
              <span
                key={index}
                className="inline-flex items-center text-white text-sm font-semibold px-3 py-1 rounded-full gap-2 border border-gray-500 bg-mainBg"
              >
                <Icon className="w-5 h-5" />
                {tag}
              </span>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedTags(getTagOptionsFromLatest());
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 justify-center h-auto px-3 py-1 rounded-full border border-gray-500 bg-transparent text-white hover:bg-gray-700 transition text-sm font-medium"
              title="Add/Edit attributes"
            >
              <Plus className="w-5 h-5" />
              {latestAttributes.length === 0 && <span>Add a tag</span>}
            </button>
          )}
        </div>
      </div>

      {/* ✅ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-mainBg p-6 rounded-lg shadow-lg w-[90%] max-w-md text-white">
            <h2 className="text-lg font-semibold mb-4">Edit Attributes</h2>
            <div className="w-full min-w-[240px] max-w-[360px]">
              <CreatableSelect
                isMulti
                defaultValue={selectedTags}
                options={sortedAttributeOptions}
                onChange={(newValue) => setSelectedTags(newValue)}
                styles={customStyles}
                placeholder="Select attributes"
                classNamePrefix="select"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-gray-600 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
