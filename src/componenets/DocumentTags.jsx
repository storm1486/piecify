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
import { useOrganization } from "../context/OrganizationContext";
import { getOrgDoc } from "../utils/firebaseHelpers";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#4f46e5" : "#d1d5db",
    color: "#1f2937",
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(79, 70, 229, 0.2)" : null,
    minWidth: "360px",
    maxWidth: "360px",
    minHeight: "2.5rem",
    "&:hover": {
      borderColor: "#9ca3af",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#ffffff",
    color: "#1f2937",
    zIndex: 20,
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#4f46e5" : "#ffffff",
    color: state.isFocused ? "#ffffff" : "#1f2937",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#4f46e5",
      color: "#ffffff",
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#e0e7ff",
    border: "1px solid #c7d2fe",
    borderRadius: "0.375rem",
    padding: "0 4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#4338ca",
    fontSize: "0.875rem",
    padding: "0 4px",
    fontWeight: "500",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#4338ca",
    ":hover": {
      backgroundColor: "#c7d2fe",
      color: "#3730a3",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9ca3af",
  }),
  input: (provided) => ({
    ...provided,
    color: "#1f2937",
  }),
};

export default function DocumentTags({ attributes, fileId, isPrivilegedUser }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [latestAttributes, setLatestAttributes] = useState(attributes);
  const [saving, setSaving] = useState(false);
  const { orgId } = useOrganization();

  useEffect(() => {
    const fetchLatestTags = async () => {
      if (isModalOpen && fileId) {
        const fileRef = getOrgDoc(orgId, "files", fileId);
        const snap = await getDoc(fileRef);
        if (snap.exists()) {
          const data = snap.data();
          const attrs = data.attributes || [];
          setLatestAttributes(attrs);
          setSelectedTags(attrs.map((tag) => ({ value: tag, label: tag })));
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

      await updateDoc(getOrgDoc(orgId, "files", fileId), {
        attributes: newAttributes,
      });

      setLatestAttributes(newAttributes);
      setIsModalOpen(false);
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
      <div className="w-full border-t border-gray-200 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {latestAttributes?.map((tag, index) => {
            const Icon = attributeIcons[tag] || HelpCircle;
            return (
              <span
                key={index}
                className="inline-flex items-center text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {tag}
              </span>
            );
          })}
          {isPrivilegedUser && (
            <button
              onClick={() => {
                setSelectedTags(getTagOptionsFromLatest());
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 justify-center px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm font-medium shadow-sm"
              title="Add/Edit attributes"
            >
              <Plus className="w-4 h-4" />
              {latestAttributes?.length === 0 ? (
                <span>Add tags</span>
              ) : (
                <span> Edit</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[90%] max-w-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Document Tags
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Attributes
              </label>
              <div className="w-full">
                <CreatableSelect
                  isMulti
                  value={selectedTags}
                  options={sortedAttributeOptions}
                  onChange={(newValue) => setSelectedTags(newValue || [])}
                  styles={customStyles}
                  placeholder="Select or create attributes..."
                  classNamePrefix="select"
                  formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Select existing attributes or type to create new ones
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
