import {
    Mars,
    Venus,
    Users,
    Smile,
    Drama,
    Feather,
    Sparkles,
    Laugh,
    ScrollText,
    Baby,
    BookOpenText,
    BookHeart,
    Speech,
  } from "lucide-react";
  import { FaVenusDouble, FaMarsDouble, FaVenusMars } from "react-icons/fa";

  export const attributeIcons = {
    Boy: Mars,
    Girl: Venus,
    HI: Laugh,
    DI: Drama,
    DUO: Users,
    POI: BookOpenText,
    CL: Baby,
    STORY: ScrollText,
    NR: BookHeart,
    DEC: Speech,
    POETRY: Feather,
    PROSE: Sparkles,
    "Girl-Girl": FaVenusDouble,
    "Boy-Boy": FaMarsDouble,
    "Boy-Girl": FaVenusMars,
    "NOVICE FRIENDLY": Smile,
  };
  
  const attributeOptions = [
    { value: "Boy", label: "Boy" },
    { value: "Girl", label: "Girl" },
    { value: "HI", label: "HI" },
    { value: "DI", label: "DI" },
    { value: "DUO", label: "DUO" },
    { value: "POI", label: "POI" },
    { value: "CL", label: "CL" },
    { value: "STORY", label: "STORY" },
    { value: "NR", label: "NR" },
    { value: "DEC", label: "DEC" },
    { value: "POETRY", label: "POETRY" },
    { value: "PROSE", label: "PROSE" },
    { value: "NOVICE FRIENDLY", label: "NOVICE FRIENDLY" },
    { value: "Girl-Girl", label: "Girl-Girl" },
    { value: "Boy-Boy", label: "Boy-Boy" },
    { value: "Boy-Girl", label: "Boy-Girl" },
  ];
  
  export const sortedAttributeOptions = [...attributeOptions].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  