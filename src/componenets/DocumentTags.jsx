"use client";

import {attributeIcons} from "@/src/componenets/AttributeIcons";
import { HelpCircle } from "lucide-react";

export default function DocumentTags({ attributes }) {
  if (!attributes || attributes.length === 0) return null;

  return (
    <div className="w-full flex justify-center pb-2 mb-2 mt-2">
      <div className="flex flex-wrap gap-2 px-4">
        {attributes.map((tag, index) => {
          const Icon = attributeIcons[tag] || HelpCircle;
          return (
            <span
              key={index}
              className="inline-flex items-center text-white-500 text-sm font-semibold px-3 py-1 rounded-full gap-2 border border-gray-500 bg-mainBg"
            >
              <Icon className="w-5 h-5" />
              {tag}
            </span>
          );
        })}
      </div>
    </div>
  );
}
