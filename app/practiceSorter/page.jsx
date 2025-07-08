"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLayout } from "@/src/context/LayoutContext";
import {
  collection,
  getDocs,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useMemo } from "react";

export default function PracticeSorterPage() {
  const [nameInput, setNameInput] = useState("");
  const [fixedRooms, setFixedRooms] = useState([]); // Empty until template is selected
  const [volunteers, setVolunteers] = useState({});
  const [presetPeople, setPresetPeople] = useState({});
  const [coachRoomFlags, setCoachRoomFlags] = useState({});
  const [dynamicRooms, setDynamicRooms] = useState([]);
  const [assignments, setAssignments] = useState({});
  const printRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const coachRooms = useMemo(() => {
    return fixedRooms.filter((room) => coachRoomFlags[room]);
  }, [fixedRooms, coachRoomFlags]);
  const [numReps, setNumReps] = useState(2); // Default to 2 reps
  const [practiceTemplates, setPracticeTemplates] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateRooms, setNewTemplateRooms] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const { setActivePage } = useLayout();
  const roomListRef = useRef();

  useEffect(() => {
    if (roomListRef.current) {
      roomListRef.current.scrollTop = roomListRef.current.scrollHeight;
    }
  }, [newTemplateRooms.length]); // only when length changes

  useEffect(() => {
    setActivePage("practiceSorter"); // ✅ update current page
    const fetchTemplates = async () => {
      const ref = collection(db, "practiceTemplates");
      const snapshot = await getDocs(ref);
      const templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPracticeTemplates(templates);

      // Try to load the "Default Practice"
      const defaultTemplate = templates.find(
        (t) => t.name === "Default Practice"
      );
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id); // if tracking selected template
        loadTemplate(defaultTemplate);
      }
    };

    fetchTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    const rooms = newTemplateRooms.map(({ name, volunteer, coachLed }) => ({
      name: name.trim(),
      volunteer: volunteer?.trim() || "",
      coachLed: !!coachLed,
    }));

    await addDoc(collection(db, "practiceTemplates"), {
      name: newTemplateName.trim(),
      rooms,
      createdAt: serverTimestamp(),
    });

    // Reset state and close modal
    setIsCreateModalOpen(false);
    setNewTemplateName("");
    setNewTemplateRooms([]);
  };

  const loadTemplate = (template) => {
    const templateRooms = template.rooms || [];

    const roomNames = templateRooms.map((r) => r.name);
    const volunteerMap = Object.fromEntries(
      templateRooms.map((r) => [r.name, r.volunteer])
    );
    const presetMap = Object.fromEntries(roomNames.map((room) => [room, ""]));
    const coachMap = Object.fromEntries(
      templateRooms.map((r) => [r.name, !!r.coachLed])
    );

    setFixedRooms(roomNames);
    setVolunteers(volunteerMap);
    setPresetPeople(presetMap);
    setCoachRoomFlags(coachMap);
    setDynamicRooms([]); // Optional: reset extras
  };

  const handleFixedVolunteerChange = (room, value) => {
    setVolunteers((prev) => ({ ...prev, [room]: value }));
  };

  const handleAddRoom = () => {
    setDynamicRooms([...dynamicRooms, { name: "", volunteer: "" }]);
  };

  const handleRemoveFixedRoom = (room) => {
    setFixedRooms((prev) => prev.filter((r) => r !== room));
    setVolunteers((prev) => {
      const updated = { ...prev };
      delete updated[room];
      return updated;
    });
    setPresetPeople((prev) => {
      const updated = { ...prev };
      delete updated[room];
      return updated;
    });
  };

  const handleRemoveRoom = (index) => {
    const updatedRooms = [...dynamicRooms];
    updatedRooms.splice(index, 1);
    setDynamicRooms(updatedRooms);
  };

  const handleRoomChange = (index, field, value) => {
    const updatedRooms = [...dynamicRooms];
    updatedRooms[index][field] = value;
    setDynamicRooms(updatedRooms);
  };

  const handleSort = async () => {
    setIsLoading(true);

    // Add a small delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 500));

    const allNames = nameInput
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    const coachRoomsList = fixedRooms.filter((room) => coachRoomFlags[room]);
    const nonCoachRoomsList = fixedRooms.filter(
      (room) => !coachRoomFlags[room]
    );

    const coachRooms = coachRoomsList.map((room) => [room, volunteers[room]]);
    const nonCoachRooms = nonCoachRoomsList.map((room) => [
      room,
      volunteers[room],
    ]);

    const coachRoomNames = coachRooms
      .map(([room]) => presetPeople[room] || "")
      .flatMap((names) => names.split("\n").map((n) => n.trim()))
      .filter(Boolean);

    const unassignedNames = allNames.filter(
      (name) => !coachRoomNames.includes(name)
    );

    const personUsedPositions = {};

    const result = {};

    // Add coach rooms with manual entries
    coachRooms.forEach(([room, coach]) => {
      const manualPeople =
        presetPeople[room]
          ?.split("\n")
          .map((n) => n.trim())
          .filter(Boolean) || [];

      result[room] = {
        volunteer: volunteers[room],
        people: manualPeople,
      };
    });

    // Prepare non-coach rooms
    const extraRooms = dynamicRooms.filter((r) => r.name.trim());
    const nonCoachRoomObjects = [
      ...nonCoachRooms.map(([room]) => ({
        name: room,
        volunteer: volunteers[room] || "",
      })),
      ...extraRooms,
    ];

    nonCoachRoomObjects.forEach((r) => {
      result[r.name] = {
        volunteer: r.volunteer,
        people: [],
      };
    });

    const NUM_REPS = Math.max(
      1,
      Math.min(parseInt(numReps || "2", 10), nonCoachRoomObjects.length)
    );
    // Initialize load tracker
    const roomLoad = {};
    nonCoachRoomObjects.forEach((r) => {
      roomLoad[r.name] = 0;
    });

    // Shuffle unassigned names
    const shuffledNames = [...unassignedNames].sort(() => Math.random() - 0.5);

    for (const name of shuffledNames) {
      // Get rooms sorted by load, with random tie-breaking
      const availableRooms = [...nonCoachRoomObjects]
        .map((r) => r.name)
        .filter((room) => !result[room].people.includes(name));

      // Sort by load, with randomized tie-breaking
      const sortedRooms = availableRooms
        .map((room) => ({
          room,
          load: roomLoad[room],
          rand: Math.random(),
        }))
        .sort((a, b) => {
          if (a.load === b.load) return a.rand - b.rand;
          return a.load - b.load;
        })
        .map((entry) => entry.room);

      const selectedRooms = sortedRooms.slice(0, NUM_REPS);

      if (selectedRooms.length < NUM_REPS) continue;
      if (!personUsedPositions[name]) personUsedPositions[name] = new Set();

      selectedRooms.forEach((room) => {
        const roomPeople = result[room].people;

        let insertIndex = 0;
        while (personUsedPositions[name].has(insertIndex)) {
          insertIndex++;
        }

        if (insertIndex >= roomPeople.length) {
          roomPeople.push(name);
        } else {
          roomPeople.splice(insertIndex, 0, name);
        }

        personUsedPositions[name].add(insertIndex);
        roomLoad[room]++;
      });
    }

    setAssignments(result);
    setIsLoading(false);
  };

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const handleClear = () => {
    setAssignments({});
    setNameInput("");
    setPresetPeople(
      Object.fromEntries(Object.keys(ROOMS).map((room) => [room, ""]))
    );
  };

  const totalPeople = nameInput.split("\n").filter((n) => n.trim()).length;
  const assignedPeople = Object.values(assignments).reduce(
    (sum, room) => sum + room.people.length,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 print:bg-white print:min-h-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        {/* Header */}
        <div className="mb-8 print:hidden">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Practice Room Sorter
          </h1>
          <p className="text-lg text-gray-600">
            Organize participants into practice rooms efficiently
          </p>

          {totalPeople > 0 && (
            <div className="mt-4 flex gap-6 text-sm">
              <span className="text-blue-600 font-medium">
                Total People: {totalPeople}
              </span>
              {Object.keys(assignments).length > 0 && (
                <span className="text-green-600 font-medium">
                  Assigned: {assignedPeople}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-8 print:hidden">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Room Templates</h2>

              {/* Select existing template */}
              <select
                className="w-full border px-3 py-2 rounded mb-2"
                value={selectedTemplateId}
                onChange={(e) => {
                  const selected = practiceTemplates.find(
                    (t) => t.id === e.target.value
                  );
                  if (selected) {
                    setSelectedTemplateId(selected.id);
                    loadTemplate(selected);
                  }
                }}
              >
                <option value="">Select a template</option>
                {practiceTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Input + Save button */}
              <button
                onClick={() => {
                  setNewTemplateName("");
                  setNewTemplateRooms([]);
                  setIsCreateModalOpen(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Create New Template
              </button>
            </div>

            {/* Names Input */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Participant Names
              </h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste names (one per line):
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={`John Doe\nJane Smith\nMike Johnson`}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                Assignment Settings
              </h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of reps each person should do:
              </label>
              <input
                type="number"
                min={1}
                max={fixedRooms.length + dynamicRooms.length}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={numReps}
                onChange={(e) => setNumReps(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>

            {/* Room Volunteers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Room Volunteers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fixedRooms.map((room) => (
                  <div
                    key={room}
                    className="w-full flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <button
                      onClick={() => handleRemoveFixedRoom(room)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 shrink-0"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded min-w-[60px] text-center shrink-0">
                      {room}
                    </span>
                    <input
                      type="text"
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder={"Volunteer name"}
                      value={volunteers[room]}
                      onChange={(e) =>
                        handleFixedVolunteerChange(room, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setFixedRooms([]);
                  setVolunteers({});
                  setPresetPeople({});
                  setCoachRoomFlags({});
                }}
                className="text-sm text-gray-600 hover:underline"
              >
                Clear All Rooms
              </button>
            </div>

            {/* Coach Room Assignments */}
            {coachRooms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0 print:rounded-none print:p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Coach Room Assignments
                </h2>
                <div className="space-y-4">
                  {coachRooms.map((room) => (
                    <div
                      key={room}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <label className="block font-medium text-gray-900 mb-2">
                        {room}{" "}
                        {volunteers[room] && (
                          <span className="text-gray-600">
                            ({volunteers[room]})
                          </span>
                        )}
                      </label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 h-20 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder={`Specific assignments for ${volunteers[room]}, one per line`}
                        value={presetPeople[room] || ""}
                        onChange={(e) =>
                          setPresetPeople((prev) => ({
                            ...prev,
                            [room]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Rooms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                Additional Rooms
              </h2>
              <div className="space-y-3">
                {dynamicRooms.map((room, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <input
                      type="text"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Room name"
                      value={room.name}
                      onChange={(e) =>
                        handleRoomChange(index, "name", e.target.value)
                      }
                    />
                    <input
                      type="text"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Volunteer name"
                      value={room.volunteer}
                      onChange={(e) =>
                        handleRoomChange(index, "volunteer", e.target.value)
                      }
                    />
                    <button
                      onClick={() => handleRemoveRoom(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddRoom}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Room
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSort}
                disabled={isLoading || !nameInput.trim() || !numReps}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sorting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Sort Participants
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
              >
                Clear All
              </button>
              {Object.keys(assignments).length > 0 && (
                <button
                  onClick={handlePrint}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 font-medium flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Print
                </button>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div
            className="print:!col-span-full print:max-w-none print:shadow-none"
            ref={printRef}
          >
            {Object.keys(assignments).length > 0 ? (
              <>
                {/* Screen Layout - Hidden When Printing */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    Room Assignments
                  </h2>
                  <div className="grid gap-4">
                    {Object.entries(assignments).map(([room, data]) => (
                      <div
                        key={room}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {room}
                          </h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {data.people.length}{" "}
                            {data.people.length === 1 ? "person" : "people"}
                          </span>
                        </div>
                        {data.volunteer && (
                          <p className="text-sm text-gray-600 mb-3 flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Volunteer: {data.volunteer}
                          </p>
                        )}
                        {data.people.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {data.people.map((person, i) => (
                              <div
                                key={i}
                                className="flex items-center text-sm text-gray-700 bg-gray-50 rounded px-3 py-2"
                              >
                                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-2">
                                  {i + 1}
                                </span>
                                {person}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-sm">
                            No participants assigned
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simple Print Layout */}
                <div className="hidden print:block">
                  <h1 className="text-xl font-bold mb-4">Room Assignments</h1>
                  <div className="print:grid print:grid-cols-2 print:gap-4 print:text-xs print:leading-snug">
                    {Object.entries(assignments).map(([room, data]) => (
                      <div key={room}>
                        <h2 className="font-semibold text-base mb-1">
                          {room} {data.volunteer && `- ${data.volunteer}`}
                        </h2>
                        {data.people.length > 0 ? (
                          <ul className="list-disc list-inside text-sm">
                            {data.people.map((person, index) => (
                              <li key={index}>{person}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm italic text-gray-600">
                            No participants assigned
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Assignments Yet
                </h3>
                <p className="text-gray-500">
                  Add participant names and click "Sort Participants" to
                  generate room assignments.
                </p>
              </div>
            )}
          </div>
        </div>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                Create Practice Template
              </h2>

              <label className="block text-sm font-medium mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
                placeholder="e.g. Tuesday Practices"
              />

              <div
                className="space-y-3 max-h-64 overflow-y-auto mb-4"
                ref={roomListRef}
              >
                {newTemplateRooms.map((room, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => {
                        const updated = [...newTemplateRooms];
                        updated[index].name = e.target.value;
                        setNewTemplateRooms(updated);
                      }}
                      placeholder="Room number (e.g. G108)"
                      className="w-1/2 border px-3 py-2 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={room.volunteer}
                      onChange={(e) => {
                        const updated = [...newTemplateRooms];
                        updated[index].volunteer = e.target.value;
                        setNewTemplateRooms(updated);
                      }}
                      placeholder="Volunteer name"
                      className="w-1/2 border px-3 py-2 rounded text-sm"
                    />
                    <label className="flex items-center gap-1 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={room.coachLed}
                        onChange={(e) => {
                          const updated = [...newTemplateRooms];
                          updated[index].coachLed = e.target.checked;
                          setNewTemplateRooms(updated);
                        }}
                      />
                      Coach-led
                    </label>
                    <button
                      onClick={() => {
                        const updated = newTemplateRooms.filter(
                          (_, i) => i !== index
                        );
                        setNewTemplateRooms(updated);
                      }}
                      className="text-red-500 hover:text-red-700"
                      title="Remove room"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setNewTemplateRooms([
                    ...newTemplateRooms,
                    { name: "", volunteer: "", coachLed: false },
                  ])
                }
                className="text-sm text-blue-600 hover:underline mb-4"
              >
                + Add Room
              </button>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={
                    !newTemplateName.trim() ||
                    newTemplateRooms.length === 0 ||
                    newTemplateRooms.some(({ name }) => !name.trim())
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
