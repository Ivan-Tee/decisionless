/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2EC",
        paperStrong: "#EFE8DE",
        card: "#FFFCF8",
        ink: "#181614",
        mist: "#7B746C",
        line: "#E6DDD3",
        accent: "#94A08B",
        accentStrong: "#708165",
        blush: "#DCCFC0"
      },
      fontFamily: {
        sans: ["System"],
        serif: ["Georgia"]
      }
    }
  },
  plugins: []
};
