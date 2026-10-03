/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F6F3",
        surface: "#FFFFFF",
        surfaceMuted: "#FAFAF9",
        borderMuted: "#E5E7EB",
        borderStrong: "#D1D5DB",
        foreground: "#111827",
        muted: "#667085",
        tech: {
          DEFAULT: "#356AE6",
          dark: "#244DB7",
          light: "#EBF1FD",
          glow: "rgba(53, 106, 230, 0.15)",
        },
        accentViolet: {
          DEFAULT: "#7768D8",
          dark: "#5A4BB5",
          light: "#F2F0FC",
        },
        warningAmber: {
          DEFAULT: "#D99A24",
          dark: "#B37A12",
          light: "#FEF7EC",
          glow: "rgba(217, 154, 36, 0.15)",
        },
        riskRed: {
          DEFAULT: "#D94A4A",
          dark: "#B83232",
          light: "#FDF2F2",
          glow: "rgba(217, 74, 74, 0.15)",
        },
        meshGreen: {
          DEFAULT: "#10B981",
          light: "#ECFDF5",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-editorial)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
        card: "0 4px 20px -2px rgba(17, 24, 39, 0.05), 0 2px 6px -1px rgba(17, 24, 39, 0.02)",
        floating: "0 20px 40px -15px rgba(17, 24, 39, 0.08)",
        scanner: "0 0 25px 2px rgba(53, 106, 230, 0.25)",
        risk: "0 0 25px 2px rgba(217, 74, 74, 0.2)",
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        waveform: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        }
      },
      animation: {
        scan: 'scan 3s ease-in-out infinite',
        pulseSlow: 'pulseSlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        waveform: 'waveform 1.2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
