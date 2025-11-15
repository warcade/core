/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    logs: false,
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
      "caramellatte",
      "abyss",
      "silk",
      {
        "dark-glass": {
          ...require("daisyui/src/theming/themes")["dark"],
          "base-100": "oklch(0.15 0.02 240 / 0.7)",
          "base-200": "oklch(0.13 0.02 240 / 0.75)",
          "base-300": "oklch(0.11 0.02 240 / 0.85)",
        }
      }
    ],
  },
}