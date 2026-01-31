import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        claw: {
          orange: "#FF6B35",
          dark: "#1a1a2e",
          darker: "#0f0f1a",
          accent: "#e94560",
          blue: "#0f3460",
        },
      },
    },
  },
  plugins: [],
};

export default config;
