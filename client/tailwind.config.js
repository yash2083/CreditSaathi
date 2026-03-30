/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF7",
        primary: {
          DEFAULT: "#1F7A63",
          50: "#F0F7F5",
          100: "#D4EDE6",
          200: "#A8DBCD",
          600: "#1A6B56",
          700: "#165A48",
          800: "#12493B",
        },
        txt: {
          DEFAULT: "#1F2937",
          secondary: "#6B7280",
          muted: "#9CA3AF",
        },
        border: "#E5E7EB",
        success: "#2E7D32",
        warning: "#E6A23C",
        danger: "#D64545",
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F3F4F6",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
        subtle: "0 1px 2px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        card: "10px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.6s ease-out",
        "slide-in-right": "slideInRight 0.6s ease-out",
        "count-up": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
