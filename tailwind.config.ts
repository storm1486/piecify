import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media", // Enables dark mode using a class
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mainBg: "#101827", // Dark navy (for main background, always)
        asideBg: "#1f2937", // Light gray (for aside background, always)
      },
    },
  },
  plugins: [],
};

export default config;
