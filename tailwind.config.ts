import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Changed from "media" to "class"
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mainBg: "#f9fafb", // Update to match gray-50
        asideBg: "#1e3a8a", // Update to match blue-900
        tag: "#06b6d4", // Keep this as is
      },
    },
  },
  plugins: [],
};

export default config;
