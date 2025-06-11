"use client";
import { useState, useRef } from "react";

const ROOMS = {
  G108: "Dejesa",
  G110: "Heather",
  G111: "Pete",
  G112: "Cook",
  G113: "Cara",
  G114: "",
  G115: "",
  G116: "",
  G118: "",
  G120: "",
  G121: "",
  G123: "",
};

export default function PracticeSorterPage() {
  const [nameInput, setNameInput] = useState("");
  const [volunteers, setVolunteers] = useState({ ...ROOMS });
  const [dynamicRooms, setDynamicRooms] = useState([]);
  const [assignments, setAssignments] = useState({});
  const printRef = useRef(null);
  const [presetPeople, setPresetPeople] = useState(
    Object.fromEntries(Object.keys(ROOMS).map((room) => [room, ""]))
  );
  const coachRooms = Object.entries(ROOMS).filter(([_, coach]) => coach.trim());
  const nonCoachRooms = Object.entries(ROOMS).filter(
    ([_, coach]) => !coach.trim()
  );

  const handleFixedVolunteerChange = (room, value) => {
    setVolunteers((prev) => ({ ...prev, [room]: value }));
  };

  const handleAddRoom = () => {
    setDynamicRooms([...dynamicRooms, { name: "", volunteer: "" }]);
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

  const handleSort = () => {
    const allNames = nameInput
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    const coachRoomNames = Object.values(presetPeople)
      .flatMap((names) => names.split("\n").map((n) => n.trim()))
      .filter(Boolean);

    // Filter names that were already assigned to coach rooms
    const unassignedNames = allNames.filter(
      (name) => !coachRoomNames.includes(name)
    );

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

    // Add non-coach rooms
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

    // Distribute remaining names among non-coach rooms
    const shuffled = [...unassignedNames].sort(() => Math.random() - 0.5);
    shuffled.forEach((name, i) => {
      const roomIndex = i % nonCoachRoomObjects.length;
      result[nonCoachRoomObjects[roomIndex].name].people.push(name);
    });

    setAssignments(result);
  };

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Practice Room Sorter</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT PANEL: Inputs */}
        <div className="lg:w-1/2">
          {/* Names input */}
          <div className="mb-6">
            <label className="block font-semibold mb-1">
              Paste Names (one per line):
            </label>
            <textarea
              className="w-full border rounded p-2 h-40"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>

          {/* Fixed Rooms */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Fixed Rooms</h2>
            {Object.keys(ROOMS).map((room) => (
              <div key={room} className="flex gap-4 items-center mb-2">
                <p className="font-medium w-24">{room}</p>
                <input
                  type="text"
                  className="border p-2 rounded flex-1"
                  placeholder="Volunteer Name"
                  value={volunteers[room]}
                  onChange={(e) =>
                    setVolunteers((prev) => ({
                      ...prev,
                      [room]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {/* Coach Room Manual Assignments */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Coach Room Manual Additions
            </h2>
            {coachRooms.map(([room]) => (
              <div key={room} className="mb-4">
                <label className="block font-medium mb-1">
                  {room} (Coach: {volunteers[room]})
                </label>
                <textarea
                  className="w-full border rounded p-2 h-20"
                  placeholder={`Names for ${room}, one per line`}
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

          {/* Dynamic Rooms */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Additional Rooms</h2>
            {dynamicRooms.map((room, index) => (
              <div key={index} className="flex gap-2 mt-2 items-center">
                <input
                  type="text"
                  className="border p-2 rounded w-1/3"
                  placeholder="Room Name"
                  value={room.name}
                  onChange={(e) =>
                    handleRoomChange(index, "name", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="border p-2 rounded w-1/2"
                  placeholder="Volunteer Name"
                  value={room.volunteer}
                  onChange={(e) =>
                    handleRoomChange(index, "volunteer", e.target.value)
                  }
                />
                <button
                  onClick={() => handleRemoveRoom(index)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddRoom}
              className="mt-3 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              + Add Room
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleSort}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Sort Names
            </button>
            <button
              onClick={handlePrint}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Print Page
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Assignments */}
        <div className="lg:w-1/2 print:p-0 print:bg-white" ref={printRef}>
          {Object.keys(assignments).length > 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Room Assignments</h2>
              <div className="grid gap-4">
                {Object.entries(assignments).map(([room, data]) => (
                  <div
                    key={room}
                    className="border rounded p-4 bg-gray-50 print:bg-white"
                  >
                    <h3 className="font-bold text-lg">{room}</h3>
                    {data.volunteer && (
                      <p className="italic text-sm mb-2 text-gray-700">
                        Volunteer: {data.volunteer}
                      </p>
                    )}
                    <ul className="list-disc list-inside">
                      {data.people.map((person, i) => (
                        <li key={i}>{person}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-gray-500 italic">
              No assignments yet. Paste names and press sort.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
