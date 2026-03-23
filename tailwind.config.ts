import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A4A',
        'navy-light': '#253a68',
        accent: '#6B3FA0',
        'success-color': '#1A7A3A',
        'warning-color': '#E67E22',
        'danger-color': '#CC0000',
      },
    },
  },
  plugins: [],
};
export default config;
