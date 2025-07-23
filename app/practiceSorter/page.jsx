"use client";
import { useState, useRef, useEffect } from "react";
import { useLayout } from "@/src/context/LayoutContext";
import {
  collection,
  getDocs,
  serverTimestamp,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useMemo } from "react";
import EnhancedRoomCard from "@/src/componenets/EnhancedRoomCard"; // Adjust path as needed
import { X } from "lucide-react";

export default function PracticeSorterPage() {
  const [nameInput, setNameInput] = useState("");
  const [fixedRooms, setFixedRooms] = useState([]);
  const [volunteers, setVolunteers] = useState({});
  const [presetPeople, setPresetPeople] = useState({});
  const [coachRoomFlags, setCoachRoomFlags] = useState({});
  const [dynamicRooms, setDynamicRooms] = useState([]);
  const [assignments, setAssignments] = useState({});
  const printRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const coachRooms = useMemo(() => {
    return fixedRooms.filter((room) => coachRoomFlags[room]);
  }, [fixedRooms, coachRoomFlags]);
  const [roomTypeFlags, setRoomTypeFlags] = useState({});
  const [numReps, setNumReps] = useState(2);
  const [practiceTemplates, setPracticeTemplates] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateRooms, setNewTemplateRooms] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const { setActivePage } = useLayout();
  const roomListRef = useRef();
  const [duoInput, setDuoInput] = useState("");
  const [speechInput, setSpeechInput] = useState("");
  const [debateInput, setDebateInput] = useState("");

  // Add this function after your existing handlePersonMove function
  const handlePersonRemove = (person, fromRoom, personIndex) => {
    setAssignments((prev) => {
      const updated = { ...prev };

      // Remove person from the specified room at specific index
      if (updated[fromRoom] && personIndex !== undefined) {
        const newPeople = [...updated[fromRoom].people];
        newPeople.splice(personIndex, 1); // Remove only the specific instance
        updated[fromRoom] = {
          ...updated[fromRoom],
          people: newPeople,
        };
      }

      return updated;
    });

    setSuccessMessage(`Removed ${person} from ${fromRoom}`);
  };

  // Replace your existing handlePersonMove function with this updated version
  const handlePersonMove = (person, fromRoom, toRoom, personIndex) => {
    if (fromRoom === toRoom) return;

    setAssignments((prev) => {
      const updated = { ...prev };

      // Remove person from source room at specific index
      if (updated[fromRoom] && personIndex !== undefined) {
        const newPeople = [...updated[fromRoom].people];
        newPeople.splice(personIndex, 1); // Remove only the specific instance
        updated[fromRoom] = {
          ...updated[fromRoom],
          people: newPeople,
        };
      }

      // Add person to destination room
      if (updated[toRoom]) {
        updated[toRoom] = {
          ...updated[toRoom],
          people: [...updated[toRoom].people, person],
        };
      }

      return updated;
    });

    setSuccessMessage(`Moved ${person} from ${fromRoom} to ${toRoom}`);
  };
  // Auto-clear messages
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError("");
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Validation helpers
  const validateNames = (input) => {
    const names = input
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index
    );
    return { names, duplicates };
  };

  const allRooms = useMemo(() => {
    return [...fixedRooms, ...dynamicRooms.map((r) => r.name).filter(Boolean)];
  }, [fixedRooms, dynamicRooms]);

  // Get total people from all inputs
  const speechPeople = speechInput.split("\n").filter((n) => n.trim()).length;
  const debatePeople = debateInput.split("\n").filter((n) => n.trim()).length;
  const duoPeople = duoInput.split("\n").filter((n) => n.trim()).length;
  const totalPeople = speechPeople + debatePeople + duoPeople;
  const assignedPeople = Object.values(assignments).reduce(
    (sum, room) => sum + room.people.length,
    0
  );

  // Preset name validation
  const presetNameCounts = useMemo(() => {
    const allPresetNames = Object.values(presetPeople).flatMap((names) =>
      names
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean)
    );

    return allPresetNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
  }, [presetPeople]);

  const duplicatePresetNames = Object.entries(presetNameCounts)
    .filter(([name, count]) => count > 1)
    .map(([name]) => name);

  useEffect(() => {
    if (roomListRef.current) {
      roomListRef.current.scrollTop = roomListRef.current.scrollHeight;
    }
  }, [newTemplateRooms.length]);

  // Add a new state for tracking loading errors
  const [loadingError, setLoadingError] = useState("");

  // Update your useEffect to handle loading errors better
  useEffect(() => {
    setActivePage("practiceSorter");
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        setLoadingError(""); // Clear any previous errors

        const ref = collection(db, "practiceTemplates");
        const snapshot = await getDocs(ref);
        const templates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPracticeTemplates(templates);

        const defaultTemplate = templates.find(
          (t) => t.name === "Default Practice"
        );
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          loadTemplate(defaultTemplate);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        setLoadingError(
          "Failed to load templates. Please refresh the page to try again."
        );
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  // Then update your loading screen to handle errors:
  if (isLoadingTemplates) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          {loadingError ? (
            // Error state
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Loading Failed
              </h2>
              <p className="text-gray-600 mb-4">{loadingError}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            </>
          ) : (
            // Loading state
            <>
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Loading Practice Sorter
              </h2>
              <p className="text-gray-600">
                Loading templates and initializing...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
  const handleSaveTemplate = async () => {
    try {
      const rooms = newTemplateRooms.map(
        ({ name, volunteer, coachLed, roomType }) => ({
          name: name.trim(),
          volunteer: volunteer?.trim() || "",
          coachLed: !!coachLed,
          roomType: roomType || "speech", // or null/"" if you want no default
        })
      );
      await addDoc(collection(db, "practiceTemplates"), {
        name: newTemplateName.trim(),
        rooms,
        createdAt: serverTimestamp(),
      });

      setSuccessMessage(`Template "${newTemplateName}" saved successfully!`);
      setIsCreateModalOpen(false);
      setNewTemplateName("");
      setNewTemplateRooms([]);

      // Refresh templates
      const ref = collection(db, "practiceTemplates");
      const snapshot = await getDocs(ref);
      const templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPracticeTemplates(templates);
    } catch (err) {
      setError("Failed to save template. Please try again.");
      console.error("Error saving template:", err);
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) return;

    try {
      await deleteDoc(doc(db, "practiceTemplates", templateId));
      setPracticeTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId("");
        // Clear current rooms
        setFixedRooms([]);
        setVolunteers({});
        setPresetPeople({});
        setCoachRoomFlags({});
      }
      setSuccessMessage(`Template "${templateName}" deleted successfully!`);
    } catch (err) {
      setError("Failed to delete template. Please try again.");
      console.error("Error deleting template:", err);
    }
  };

  const loadTemplate = (template) => {
    const templateRooms = template.rooms || [];

    const typeMap = Object.fromEntries(
      templateRooms.map((r) => [r.name, r.roomType || ""])
    );

    const roomNames = templateRooms.map((r) => r.name);
    const volunteerMap = Object.fromEntries(
      templateRooms.map((r) => [r.name, r.volunteer])
    );
    const presetMap = Object.fromEntries(roomNames.map((room) => [room, ""]));
    const coachMap = Object.fromEntries(
      templateRooms.map((r) => [r.name, !!r.coachLed])
    );

    setRoomTypeFlags(typeMap);
    setFixedRooms(roomNames);
    setVolunteers(volunteerMap);
    setPresetPeople(presetMap);
    setCoachRoomFlags(coachMap);
    setDynamicRooms([]);
  };

  const handleFixedVolunteerChange = (room, value) => {
    setVolunteers((prev) => ({ ...prev, [room]: value }));
  };

  const handleAddRoom = () => {
    setDynamicRooms([
      ...dynamicRooms,
      { name: "", volunteer: "", roomType: "" },
    ]);
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
    setCoachRoomFlags((prev) => {
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

  // Improved assignment function that respects rep limits
  const assignToRooms = (participantList, availableRooms, globalRepsLeft) => {
    const roomLoad = Object.fromEntries(availableRooms.map((r) => [r, 0]));
    const result = Object.fromEntries(
      availableRooms.map((roomName) => {
        // try fixed-room map first, then dynamicRooms array
        const volunteer =
          volunteers[roomName] ??
          dynamicRooms.find((r) => r.name === roomName)?.volunteer ??
          "";
        return [roomName, { volunteer, people: [] }];
      })
    );

    if (availableRooms.length === 0) return result;

    let stillAssigning = true;
    while (stillAssigning) {
      stillAssigning = false;

      // Filter participants who can still be assigned
      const eligibleParticipants = participantList.filter((entry) => {
        const individuals = extractIndividuals(entry);
        return individuals.every((person) => globalRepsLeft[person] > 0);
      });

      if (eligibleParticipants.length === 0) break;

      // Shuffle for randomness
      const shuffled = [...eligibleParticipants].sort(
        () => Math.random() - 0.5
      );

      for (const entry of shuffled) {
        const individuals = extractIndividuals(entry);

        // Check if this entry can still be assigned
        if (individuals.every((person) => globalRepsLeft[person] > 0)) {
          // Find the least loaded room
          const selectedRoom = availableRooms
            .map((r) => ({ r, load: roomLoad[r] }))
            .sort((a, b) => a.load - b.load)[0].r;

          // Assign the entry
          result[selectedRoom].people.push(entry);
          roomLoad[selectedRoom]++;

          // Decrement rep counts for all individuals in the entry
          individuals.forEach((person) => {
            globalRepsLeft[person]--;
          });

          stillAssigning = true;
        }
      }
    }

    return result;
  };
  // Helper function to extract individuals from entries (handles duos)
  const extractIndividuals = (entry) => {
    return entry.toLowerCase().includes(" and ")
      ? entry
          .toLowerCase()
          .split(" and ")
          .map((n) => n.trim())
      : [entry.toLowerCase().trim()];
  };

  const handleSort = async () => {
    setIsLoading(true);
    setError("");

    try {
      // 1. Parse all participant lists ONCE
      const speechNames = speechInput
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      const debateNames = debateInput
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      const duoNames = duoInput
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      console.log("speechNames", speechNames);
      console.log("debateNames", debateNames);
      console.log("duoNames", duoNames);

      // 2. Get manual coach room names
      const manualCoachNames = Object.entries(presetPeople)
        .filter(([room]) => coachRoomFlags[room])
        .flatMap(([, text]) =>
          text
            .split("\n")
            .map((n) => n.trim())
            .filter(Boolean)
        );

      // 3. Combine all unique participants
      const allParticipants = Array.from(
        new Set([
          ...speechNames,
          ...debateNames,
          ...duoNames,
          ...manualCoachNames,
        ])
      );

      console.log("allParticipants", allParticipants);

      if (allParticipants.length === 0) {
        setError("Please add at least one participant.");
        return;
      }

      if (allRooms.length === 0) {
        setError("Please add at least one room before sorting.");
        return;
      }

      // 4. Initialize global rep counter for all individuals
      const globalRepsLeft = {};
      allParticipants.forEach((entry) => {
        extractIndividuals(entry).forEach((person) => {
          if (!globalRepsLeft[person]) {
            globalRepsLeft[person] = numReps; // Start with full rep count
          }
        });
      });

      // 5. FIRST - Account for existing coach room assignments
      // Subtract reps for people already assigned to coach rooms
      Object.entries(presetPeople).forEach(([room, text]) => {
        if (coachRoomFlags[room]) {
          const assignedPeople = text
            .split("\n")
            .map((n) => n.trim())
            .filter(Boolean);

          assignedPeople.forEach((person) => {
            const individuals = extractIndividuals(person);
            individuals.forEach((individual) => {
              const normalizedName = individual.toLowerCase().trim();
              if (globalRepsLeft[normalizedName] !== undefined) {
                globalRepsLeft[normalizedName] = Math.max(
                  0,
                  globalRepsLeft[normalizedName] - 1
                );
              }
            });
          });
        }
      });

      // 6. Get non-coach rooms by type
      const nonCoachFixedRooms = fixedRooms.filter((r) => !coachRoomFlags[r]);
      const nonCoachDynamicRooms = dynamicRooms
        .filter((r) => r.name.trim())
        .map((r) => r.name);

      // Helper function to get room type for any room
      const getRoomType = (roomName) => {
        // Check if it's a fixed room
        if (fixedRooms.includes(roomName)) {
          return roomTypeFlags[roomName] || "";
        }
        // Check if it's a dynamic room
        const dynamicRoom = dynamicRooms.find((r) => r.name === roomName);
        return dynamicRoom?.roomType || "";
      };

      const allNonCoachRooms = [...nonCoachFixedRooms, ...nonCoachDynamicRooms];

      const speechRooms = allNonCoachRooms.filter(
        (r) => getRoomType(r) === "speech"
      );
      const debateRooms = allNonCoachRooms.filter(
        (r) => getRoomType(r) === "debate"
      );
      const unspecifiedRooms = allNonCoachRooms.filter((r) => {
        const type = getRoomType(r);
        return !type || type === "";
      });

      // Add debugging
      console.log("Debug room info:");
      console.log("speechRooms:", speechRooms);
      console.log("debateRooms:", debateRooms);
      console.log("unspecifiedRooms:", unspecifiedRooms);

      // 7. Validate room availability
      if (
        speechNames.length > 0 &&
        speechRooms.length === 0 &&
        unspecifiedRooms.length === 0
      ) {
        setError("No speech rooms available for speech participants.");
        return;
      }
      if (
        debateNames.length > 0 &&
        debateRooms.length === 0 &&
        unspecifiedRooms.length === 0
      ) {
        setError("No debate rooms available for debate participants.");
        return;
      }

      // 8. ONE-TIME Duo assignment
      // Build a temp rep-map so each duo only goes once:
      const duoRepLeft = {};
      duoNames.forEach((entry) =>
        extractIndividuals(entry).forEach((p) => {
          duoRepLeft[p] = 1;
        })
      );

      // Only assign duos into speech rooms
      const duoAssignments = assignToRooms(duoNames, speechRooms, duoRepLeft);

      // And *consume* one rep from each duo-member in your main counts:
      Object.values(duoAssignments).forEach(({ people }) => {
        people.forEach((duoEntry) => {
          extractIndividuals(duoEntry).forEach((p) => {
            if (globalRepsLeft[p] !== undefined) {
              globalRepsLeft[p] = Math.max(0, globalRepsLeft[p] - 1);
            }
          });
        });
      });

      // 9. Assign participants to rooms using the improved algorithm
      const speechAssignments = assignToRooms(
        speechNames,
        speechRooms.length > 0 ? speechRooms : unspecifiedRooms,
        globalRepsLeft
      );

      const debateAssignments = assignToRooms(
        debateNames,
        debateRooms.length > 0 ? debateRooms : unspecifiedRooms,
        globalRepsLeft
      );

      // 10. Now we need to add people who still need more reps to additional rooms
      // Create a list of people who still need more assignments
      const peopleNeedingMoreReps = [];
      Object.entries(globalRepsLeft).forEach(([person, repsLeft]) => {
        for (let i = 0; i < repsLeft; i++) {
          // Determine if this person is primarily a speech or debate participant
          const isInSpeech = speechNames.some((name) =>
            extractIndividuals(name)
              .map((p) => p.toLowerCase().trim())
              .includes(person)
          );
          const isInDebate = debateNames.some((name) =>
            extractIndividuals(name)
              .map((p) => p.toLowerCase().trim())
              .includes(person)
          );

          // Find the original name format (not just lowercase)
          let originalName = person;
          [
            ...speechNames,
            ...debateNames,
            ...duoNames,
            ...manualCoachNames,
          ].forEach((name) => {
            extractIndividuals(name).forEach((individual) => {
              if (individual.toLowerCase().trim() === person) {
                originalName = individual;
              }
            });
          });

          peopleNeedingMoreReps.push({
            name: originalName,
            type: isInSpeech ? "speech" : isInDebate ? "debate" : "speech", // default to speech
          });
        }
      });

      // Sort these people into appropriate rooms
      if (peopleNeedingMoreReps.length > 0) {
        console.log("People needing more reps:", peopleNeedingMoreReps);

        // Separate by type
        const speechPeopleNeedingReps = peopleNeedingMoreReps
          .filter((p) => p.type === "speech")
          .map((p) => p.name);
        const debatePeopleNeedingReps = peopleNeedingMoreReps
          .filter((p) => p.type === "debate")
          .map((p) => p.name);

        // Create temporary rep counters for additional assignments
        const additionalRepsLeft = {};
        peopleNeedingMoreReps.forEach(({ name }) => {
          const normalizedName = name.toLowerCase().trim();
          additionalRepsLeft[normalizedName] =
            (additionalRepsLeft[normalizedName] || 0) + 1;
        });

        // Assign additional reps
        const additionalSpeechAssignments = assignToRooms(
          speechPeopleNeedingReps,
          speechRooms.length > 0 ? speechRooms : unspecifiedRooms,
          additionalRepsLeft
        );

        const additionalDebateAssignments = assignToRooms(
          debatePeopleNeedingReps,
          debateRooms.length > 0 ? debateRooms : unspecifiedRooms,
          additionalRepsLeft
        );

        // Merge additional assignments with existing ones
        Object.entries(additionalSpeechAssignments).forEach(([room, data]) => {
          if (speechAssignments[room]) {
            speechAssignments[room].people.push(...data.people);
          } else {
            speechAssignments[room] = data;
          }
        });

        Object.entries(additionalDebateAssignments).forEach(([room, data]) => {
          if (debateAssignments[room]) {
            debateAssignments[room].people.push(...data.people);
          } else {
            debateAssignments[room] = data;
          }
        });
      }

      // 11. Build final result including coach rooms
      const result = {};

      // 1) coach rooms…
      fixedRooms
        .filter((r) => coachRoomFlags[r])
        .forEach((room) => {
          result[room] = {
            volunteer: volunteers[room] || "",
            people: (presetPeople[room] || "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
            type: "coach", // Coach rooms always get "coach" type
          };
        });

      // 2) merge speech & debate assignments and add type information
      Object.entries(speechAssignments).forEach(([room, data]) => {
        result[room] = {
          ...data,
          type: getRoomType(room) || "speech", // Default to "speech" if no type specified
        };
      });

      Object.entries(debateAssignments).forEach(([room, data]) => {
        result[room] = {
          ...data,
          type: getRoomType(room) || "debate", // Default to "debate" if no type specified
        };
      });

      // 3) then append each duo into its speech room (duos only go to speech rooms)
      Object.entries(duoAssignments).forEach(([room, { people }]) => {
        if (people.length && result[room]) {
          result[room].people.push(...people);
          // Ensure the room type is set to speech since duos only go to speech rooms
          if (!result[room].type || result[room].type === "") {
            result[room].type = "speech";
          }
        }
      });

      setAssignments(result);
      setSuccessMessage("Participants sorted successfully!");
    } catch (err) {
      console.error("Sorting error:", err);
      setError("An error occurred while sorting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const handleClear = () => {
    setAssignments({});
    setSpeechInput("");
    setDebateInput("");
    setDuoInput("");
    setPresetPeople(Object.fromEntries(fixedRooms.map((room) => [room, ""])));
    setSuccessMessage("All assignments cleared.");
  };

  const canSort =
    (speechInput.trim() || debateInput.trim() || duoInput.trim()) &&
    allRooms.length > 0 &&
    numReps &&
    allRooms.filter((r) => !coachRoomFlags[r]).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 print:bg-white print:min-h-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        {/* Error/Success Messages */}
        {(error || successMessage) && (
          <div
            className={`mb-6 p-4 rounded-lg border print:hidden ${
              error
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center">
              {error ? (
                <svg
                  className="w-5 h-5 mr-2 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="font-medium">{error || successMessage}</span>
              <button
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                }}
                className="ml-auto text-gray-400 hover:text-gray-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8 print:hidden">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Practice Room Sorter
          </h1>
          <p className="text-lg text-gray-600">
            Organize participants into practice rooms efficiently
          </p>

          {/* Stats Cards */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-gray-600">Total People:</span>
              <span className="ml-1 font-semibold text-blue-600">
                {totalPeople}
              </span>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-gray-600">Total Rooms:</span>
              <span className="ml-1 font-semibold text-indigo-600">
                {allRooms.length}
              </span>
            </div>
            {Object.keys(assignments).length > 0 && (
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                <span className="text-gray-600">Assigned:</span>
                <span className="ml-1 font-semibold text-green-600">
                  {assignedPeople}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-8 print:hidden">
            {/* Quick Tips */}
            {!Object.keys(assignments).length && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Quick Tips
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Coach rooms are for manual assignments (won&apos;t be
                    auto-sorted)
                  </li>
                  <li>
                    • Regular rooms will be automatically filled based on your
                    rep count
                  </li>
                  <li>
                    • Each person will be assigned to exactly the number of reps
                    you specify
                  </li>
                  <li>
                    • Load balancing ensures even distribution across rooms
                  </li>
                </ul>
              </div>
            )}
            {/* Templates */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Room Templates</h2>

              {/* Important Notice */}
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-7.938 4h15.876c1.04 0 1.84-.92 1.653-1.946L17.729 4.406c-.129-.704-.77-1.235-1.514-1.235H7.785c-.744 0-1.385.531-1.514 1.235L3.409 16.054C3.222 17.08 4.22 18 5.26 18z"
                    />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">
                      Template Requirements:
                    </p>
                    <ul className="text-amber-700 space-y-1">
                      <li>
                        • Include <strong>ALL</strong> rooms you want to use,
                        even if they don't have volunteers yet
                      </li>
                      <li>
                        • The template named <strong>"Default Practice"</strong>{" "}
                        will automatically load when you visit this page
                      </li>
                      <li>
                        • You can always add volunteers later in the "Room
                        Volunteers" section
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Template Selection and Controls */}
              <div className="flex gap-2 mb-4">
                <select
                  className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const selected = practiceTemplates.find(
                      (t) => t.id === e.target.value
                    );
                    if (selected) {
                      setSelectedTemplateId(selected.id);
                      loadTemplate(selected);
                      setSuccessMessage(`Loaded template: ${selected.name}`);
                    }
                  }}
                >
                  <option value="">Select a template</option>
                  {practiceTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.name === "Default Practice" &&
                        " (Auto-loads on page visit)"}{" "}
                      ({t.rooms?.length || 0}{" "}
                      {t.rooms?.length > 1 ? "rooms" : "room"})
                    </option>
                  ))}
                </select>

                {selectedTemplateId && (
                  <button
                    onClick={() => {
                      const template = practiceTemplates.find(
                        (t) => t.id === selectedTemplateId
                      );
                      if (template && template.name === "Default Practice") {
                        setError(
                          "Cannot delete the 'Default Practice' template as it's required for auto-loading on page visits."
                        );
                        return;
                      }
                      if (template) {
                        handleDeleteTemplate(template.id, template.name);
                      }
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors"
                    title="Delete selected template"
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
                )}
              </div>

              {/* Create Template Button */}
              <button
                onClick={() => {
                  setNewTemplateName("");
                  setNewTemplateRooms([]);
                  setIsCreateModalOpen(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                + Create New Template
              </button>

              {/* Optional: Show template count for reference */}
              {practiceTemplates.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {practiceTemplates.length} template
                  {practiceTemplates.length !== 1 ? "s" : ""} available
                </p>
              )}
            </div>
            {/* Names Input */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Participant Names
                <span className="ml-auto text-sm font-normal text-gray-500">
                  {totalPeople} {totalPeople === 1 ? "person" : "people"}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Speech pool */}
                <div>
                  <h3 className="font-medium">Speech Participants</h3>
                  <textarea
                    className="w-full border p-2 rounded min-h-32 resize-y max-h-64 overflow-y-auto"
                    value={speechInput}
                    onChange={(e) => setSpeechInput(e.target.value)}
                    placeholder={`Alice\nBob\nCharlie`}
                  />
                </div>

                {/* Debate pool */}
                <div>
                  <h3 className="font-medium">Debate Participants</h3>
                  <textarea
                    className="w-full border p-2 rounded min-h-32 resize-y max-h-64 overflow-y-auto"
                    value={debateInput}
                    onChange={(e) => setDebateInput(e.target.value)}
                    placeholder={`Xavier\nYolanda\nZoe`}
                  />
                </div>
              </div>

              {/* Validation warnings */}
              {(() => {
                const { duplicates } = validateNames(nameInput);
                if (duplicates.length > 0) {
                  return (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <strong>Duplicate names:</strong> {duplicates.join(", ")}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            {/* Duo Sort */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Duos</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add duo names (e.g. Jack and Jill), one per line:
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 min-h-24 max-h-48 resize-y overflow-y-auto"
                value={duoInput}
                onChange={(e) => setDuoInput(e.target.value)}
                placeholder={`Jack and Jill\nJohn and Doe`}
              />
            </div>
            {/* Assignment Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                Assignment Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of reps each person should do:
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={numReps}
                    onChange={(e) => setNumReps(e.target.value)}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>
            </div>
            {/* Room Volunteers */}
            {fixedRooms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Room Volunteers
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {fixedRooms.length}{" "}
                    {fixedRooms.length === 1 ? "room" : "rooms"}
                  </span>
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-sm px-2 py-1 rounded min-w-[60px] text-center ${
                            coachRoomFlags[room]
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {room}
                        </span>
                      </div>
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
                <div className="mt-4 flex justify-between items-center text-sm">
                  <button
                    onClick={() => {
                      setFixedRooms([]);
                      setVolunteers({});
                      setPresetPeople({});
                      setCoachRoomFlags({});
                    }}
                    className="text-gray-600 hover:text-red-600 hover:underline"
                  >
                    Clear All Rooms
                  </button>
                  <span className="text-gray-500">
                    {Object.values(volunteers).filter(Boolean).length} of{" "}
                    {fixedRooms.length} have volunteers
                  </span>
                </div>
              </div>
            )}
            {/* Coach Room Assignments */}
            {coachRooms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Coach Room Assignments
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    Manual assignments
                  </span>
                </h2>

                {duplicatePresetNames.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 text-red-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-red-700 font-medium">
                        Names appear in multiple coach rooms:{" "}
                        {duplicatePresetNames.join(", ")}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {coachRooms.map((room) => {
                    const peopleCount = (presetPeople[room] || "")
                      .split("\n")
                      .filter((n) => n.trim()).length;
                    return (
                      <div
                        key={room}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <label className="block font-medium text-gray-900 mb-2 flex items-center justify-between">
                          <span>
                            {room}{" "}
                            {volunteers[room] && (
                              <span className="text-gray-600 font-normal">
                                ({volunteers[room]})
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-gray-500 font-normal">
                            {peopleCount}{" "}
                            {peopleCount === 1 ? "person" : "people"}
                          </span>
                        </label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg p-3 h-20 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                          placeholder={`Specific assignments for ${
                            volunteers[room] || "this room"
                          }, one per line`}
                          value={presetPeople[room] || ""}
                          onChange={(e) =>
                            setPresetPeople((prev) => ({
                              ...prev,
                              [room]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Additional Rooms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                Additional Rooms
                <span className="ml-auto text-sm font-normal text-gray-500">
                  {dynamicRooms.length} extra{" "}
                  {dynamicRooms.length === 1 ? "room" : "rooms"}
                </span>
              </h2>
              <div className="space-y-4">
                {dynamicRooms.map((room, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Room Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Room #{index + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveRoom(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-md transition-all duration-200 group"
                        title="Remove room"
                      >
                        <svg
                          className="w-4 h-4 group-hover:scale-110 transition-transform"
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

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Room Name */}
                      <div className="lg:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Room Name *
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          placeholder="e.g. G108"
                          value={room.name}
                          onChange={(e) =>
                            handleRoomChange(index, "name", e.target.value)
                          }
                        />
                      </div>

                      {/* Volunteer Name */}
                      <div className="lg:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Volunteer
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          placeholder="Volunteer name"
                          value={room.volunteer}
                          onChange={(e) =>
                            handleRoomChange(index, "volunteer", e.target.value)
                          }
                        />
                      </div>

                      {/* Room Type */}
                      <div className="lg:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Room Type
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          value={room.roomType}
                          onChange={(e) =>
                            handleRoomChange(index, "roomType", e.target.value)
                          }
                        >
                          <option value="">— Select Type —</option>
                          <option value="speech">Speech</option>
                          <option value="debate">Debate</option>
                        </select>
                      </div>
                    </div>

                    {/* Room Type Indicator */}
                    {room.roomType && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            room.roomType === "speech"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {room.roomType.charAt(0).toUpperCase() +
                            room.roomType.slice(1)}{" "}
                          Room
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Room Button */}
                <button
                  onClick={handleAddRoom}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
                >
                  <svg
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
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
                disabled={isLoading || !canSort}
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
                    {!canSort && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded ml-1">
                        Add names & rooms
                      </span>
                    )}
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      Room Assignments
                    </h2>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Drag to reassign
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-blue-900">
                        {Object.keys(assignments).length}
                      </div>
                      <div className="text-blue-700">Total Rooms</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-green-900">
                        {Math.min(
                          ...Object.values(assignments).map(
                            (r) => r.people.length
                          )
                        )}{" "}
                        -{" "}
                        {Math.max(
                          ...Object.values(assignments).map(
                            (r) => r.people.length
                          )
                        )}
                      </div>
                      <div className="text-green-700">People Range</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-purple-900">
                        {coachRooms.length}
                      </div>
                      <div className="text-purple-700">Coach Rooms</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-orange-900">
                        {numReps}
                      </div>
                      <div className="text-orange-700">Reps per Person</div>
                    </div>
                  </div>

                  {/* Enhanced Room Cards - NEW FEATURE */}
                  <div className="grid gap-4">
                    {Object.entries(assignments)
                      .sort(([a], [b]) => {
                        // Sort coach rooms first, then by room name
                        const aIsCoach = coachRoomFlags[a];
                        const bIsCoach = coachRoomFlags[b];
                        if (aIsCoach && !bIsCoach) return -1;
                        if (!aIsCoach && bIsCoach) return 1;
                        return a.localeCompare(b);
                      })
                      .map(([room, data]) => (
                        <EnhancedRoomCard
                          key={room}
                          room={room}
                          data={data}
                          coachRoomFlags={coachRoomFlags}
                          onPersonMove={handlePersonMove}
                          onPersonRemove={handlePersonRemove} // Add this new prop
                        />
                      ))}
                  </div>
                </div>

                {/* Simple Print Layout */}
                <div className="hidden print:block">
                  <h1 className="text-xl font-bold mb-4">Room Assignments</h1>
                  <div className="print:grid print:grid-cols-2 print:gap-4 print:text-xs print:leading-snug">
                    {Object.entries(assignments)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([room, data]) => {
                        // Helper function to format room type for print
                        const getRoomTypeText = (type) => {
                          switch (type) {
                            case "coach":
                              return "Coach Room";
                            case "speech":
                              return "Speech Room";
                            case "debate":
                              return "Debate Room";
                            default:
                              return "";
                          }
                        };

                        const roomTypeText = getRoomTypeText(data.type);

                        return (
                          <div key={room} className="mb-4">
                            <h2 className="font-semibold text-base mb-1">
                              {room}
                              {data.volunteer && ` - ${data.volunteer}`}
                              {roomTypeText && ` (${roomTypeText})`}
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
                        );
                      })}
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
                <p className="text-gray-500 mb-4">
                  Add participant names and click &quot;Sort Participants&quot;
                  to generate room assignments.
                </p>

                {!canSort && (
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>To get started:</p>
                    <ul className="text-left inline-block">
                      {!nameInput.trim() && <li>• Add participant names</li>}
                      {allRooms.length === 0 && (
                        <li>• Select a template or add rooms</li>
                      )}
                      {allRooms.filter((room) => !coachRoomFlags[room])
                        .length === 0 && (
                        <li>• Add at least one non-coach room</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Create Practice Template
                    </h2>
                    <p className="text-blue-100 mt-1">
                      Set up a reusable room configuration
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-blue-100 hover:text-white hover:bg-blue-600 rounded-full p-2 transition-all duration-200"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Template Name */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g. Default Practice"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    💡 Name it "Default Practice" to have it auto-load when
                    users visit this page
                  </p>
                </div>

                {/* Important Instructions */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Important: Add ALL Your Rooms
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>
                        You must include every room you want to use in this
                        template, even if:
                      </strong>
                    </p>
                    <ul className="ml-4 space-y-1">
                      <li>• The room doesn't have a volunteer assigned yet</li>
                      <li>
                        • You're not sure who will volunteer for that room
                      </li>
                      <li>• The room might not be used every time</li>
                    </ul>
                    <p className="font-medium">
                      Why? The template defines all available rooms. You can
                      always:
                    </p>
                    <ul className="ml-4 space-y-1">
                      <li>
                        • Add volunteers later in the "Room Volunteers" section
                      </li>
                      <li>• Leave volunteer fields blank - they're optional</li>
                      <li>
                        • Add extra rooms using "Additional Rooms" if needed
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Rooms Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Practice Rooms *
                    </label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {newTemplateRooms.length} room
                      {newTemplateRooms.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Add all rooms you might need. Volunteer names are optional
                    and can be added later.
                  </p>

                  {/* Rest of the rooms section remains the same... */}
                  <div
                    className="space-y-3 max-h-80 overflow-y-auto pr-2"
                    ref={roomListRef}
                  >
                    {newTemplateRooms.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        <svg
                          className="w-12 h-12 mx-auto mb-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <p className="text-sm font-medium">
                          No rooms added yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click "Add Room" and include ALL rooms you might use
                        </p>
                      </div>
                    ) : (
                      newTemplateRooms.map((room, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex gap-3 items-start">
                            {/* Room Number */}
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Room Number *
                              </label>
                              <input
                                type="text"
                                value={room.name}
                                onChange={(e) => {
                                  const updated = [...newTemplateRooms];
                                  updated[index].name = e.target.value;
                                  setNewTemplateRooms(updated);
                                }}
                                placeholder="e.g. G108"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              />
                            </div>

                            {/* Volunteer Name */}
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Volunteer{" "}
                                <span className="text-gray-400">
                                  (Optional)
                                </span>
                              </label>
                              <input
                                type="text"
                                value={room.volunteer}
                                onChange={(e) => {
                                  const updated = [...newTemplateRooms];
                                  updated[index].volunteer = e.target.value;
                                  setNewTemplateRooms(updated);
                                }}
                                placeholder="Leave blank if unknown"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              />
                            </div>

                            {/* Remove Button */}
                            <div className="pt-6">
                              <button
                                onClick={() => {
                                  const updated = newTemplateRooms.filter(
                                    (_, i) => i !== index
                                  );
                                  setNewTemplateRooms(updated);
                                }}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-all duration-200"
                                title="Remove room"
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
                          </div>

                          {/* Coach-led Checkbox and Room Type */}
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={room.coachLed}
                                onChange={(e) => {
                                  const updated = [...newTemplateRooms];
                                  updated[index].coachLed = e.target.checked;
                                  setNewTemplateRooms(updated);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium">
                                Coach-led room
                              </span>
                              <span className="text-xs text-gray-500">
                                (for manual assignments)
                              </span>
                            </label>

                            <div className="flex items-center gap-2 text-sm">
                              <span>Room category:</span>
                              <select
                                value={room.roomType}
                                onChange={(e) => {
                                  const updated = [...newTemplateRooms];
                                  updated[index].roomType = e.target.value;
                                  setNewTemplateRooms(updated);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="">— select —</option>
                                <option value="speech">Speech</option>
                                <option value="debate">Debate</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Room Button */}
                  <button
                    onClick={() =>
                      setNewTemplateRooms([
                        ...newTemplateRooms,
                        {
                          name: "",
                          volunteer: "",
                          coachLed: false,
                          roomType: "",
                        },
                      ])
                    }
                    className="w-full mt-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg py-3 px-4 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
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
                    Add Another Room
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {newTemplateRooms.length > 0 && (
                    <span>
                      {newTemplateRooms.filter((r) => r.name.trim()).length} of{" "}
                      {newTemplateRooms.length} rooms have names
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
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
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
