import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11151C",      // app background
        steel: "#1B2230",    // card surface
        edge: "#2A3344",     // borders / dividers
        chalk: "#E8EBF2",    // primary text
        dust: "#8A93A6",     // muted text
        signal: "#FFB454",   // primary accent (amber)
        ember: "#FF6B4A",    // destructive / intensity
        gold: "#F5C84C"      // PR highlights
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "Archivo", "system-ui", "sans-serif"]
      },
      borderRadius: { card: "1rem" }
    }
  },
  plugins: []
};
export default config;
