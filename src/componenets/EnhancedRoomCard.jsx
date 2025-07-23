import React, { useState } from "react";
import { Edit2, GripVertical, X } from "lucide-react";

const EnhancedRoomCard = ({
  room,
  data,
  coachRoomFlags,
  onPersonMove,
  onPersonRemove,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedPerson, setDraggedPerson] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (
        dragData.person &&
        dragData.fromRoom &&
        dragData.personIndex !== undefined
      ) {
        onPersonMove(
          dragData.person,
          dragData.fromRoom,
          room,
          dragData.personIndex
        );
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  };

  const handleRemovePerson = (person, personIndex) => {
    if (onPersonRemove) {
      onPersonRemove(person, room, personIndex);
    }
  };

  const getRoomTypeColor = (type) => {
    switch (type) {
      case "coach":
        return "bg-purple-100 text-purple-700";
      case "speech":
        return "bg-blue-100 text-blue-700";
      case "debate":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoomUtilizationColor = (count) => {
    if (count === 0) return "bg-red-400";
    if (count <= 2) return "bg-yellow-400";
    if (count <= 4) return "bg-green-400";
    return "bg-blue-400";
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-200 ${
        isDragOver
          ? "border-blue-400 bg-blue-50 shadow-md transform scale-[1.02]"
          : coachRoomFlags[room]
          ? "border-purple-200 bg-purple-50 hover:shadow-md"
          : "border-gray-200 hover:shadow-md"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-gray-900">{room}</h3>

          {/* Room Type Badge */}
          {data.type && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${getRoomTypeColor(
                data.type
              )}`}
            >
              {data.type === "coach"
                ? "Coach Room"
                : data.type === "speech"
                ? "Speech Room"
                : data.type === "debate"
                ? "Debate Room"
                : data.type}
            </span>
          )}
        </div>

        {/* Room Stats */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${getRoomUtilizationColor(
              data.people.length
            )}`}
          />
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {data.people.length}{" "}
            {data.people.length === 1 ? "person" : "people"}
          </span>
        </div>
      </div>

      {/* Volunteer Info */}
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

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="mb-3 p-2 border-2 border-dashed border-blue-300 rounded-lg bg-blue-25 text-center">
          <span className="text-sm text-blue-600 font-medium">
            Drop person here
          </span>
        </div>
      )}

      {/* People List - UPDATED to handle duplicates and removal */}
      {data.people.length > 0 ? (
        <div className="space-y-2">
          {data.people.map((person, i) => {
            // Count how many times this name appears up to this index
            const nameCount = data.people
              .slice(0, i + 1)
              .filter((p) => p === person).length;
            const totalNameCount = data.people.filter(
              (p) => p === person
            ).length;

            return (
              <div
                key={`${person}-${i}`}
                className={`flex items-center text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 transition-all duration-200 group hover:bg-gray-100 ${
                  draggedPerson === `${person}-${i}`
                    ? "opacity-50 transform rotate-2"
                    : ""
                }`}
              >
                {/* Drag Handle */}
                <div
                  draggable
                  onDragStart={(e) => {
                    const dragData = {
                      person,
                      fromRoom: room,
                      personIndex: i,
                    };
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify(dragData)
                    );
                    setDraggedPerson(`${person}-${i}`);
                  }}
                  onDragEnd={() => {
                    setDraggedPerson(null);
                  }}
                  className="cursor-move flex items-center flex-1"
                >
                  <GripVertical className="w-3 h-3 text-gray-400 mr-2 group-hover:text-gray-600" />
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-2 group-hover:bg-blue-600 transition-colors">
                    {i + 1}
                  </span>
                  <span className="flex-1 flex items-center justify-between">
                    <span>{person}</span>
                    {/* Improved duplicate name indicator */}
                    {totalNameCount > 1 && (
                      <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full min-w-[24px] text-center">
                        {nameCount}
                      </span>
                    )}
                  </span>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemovePerson(person, i)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title={`Remove ${person} from ${room}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 italic text-sm">
            No participants assigned
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Drag people here to assign them
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedRoomCard;
