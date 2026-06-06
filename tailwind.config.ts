import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          bright: "hsl(var(--surface-bright))",
          dim: "hsl(var(--surface-dim))",
          container: "hsl(var(--surface-container))",
          "container-lowest": "hsl(var(--surface-container-lowest))",
          "container-low": "hsl(var(--surface-container-low))",
          "container-high": "hsl(var(--surface-container-high))",
          "container-highest": "hsl(var(--surface-container-highest))"
        },
        outline: {
          DEFAULT: "hsl(var(--outline))",
          variant: "hsl(var(--outline-variant))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
          "container-foreground": "hsl(var(--primary-container-foreground))",
          fixed: "hsl(var(--primary-fixed))",
          "fixed-dim": "hsl(var(--primary-fixed-dim))",
          "fixed-foreground": "hsl(var(--primary-fixed-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          container: "hsl(var(--secondary-container))",
          "container-foreground": "hsl(var(--secondary-container-foreground))"
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          container: "hsl(var(--tertiary-container))",
          "container-foreground": "hsl(var(--tertiary-container-foreground))",
          fixed: "hsl(var(--tertiary-fixed))",
          "fixed-dim": "hsl(var(--tertiary-fixed-dim))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          container: "hsl(var(--destructive-container))",
          "container-foreground": "hsl(var(--destructive-container-foreground))"
        }
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "8px"
      },
      spacing: {
        "container-padding": "24px",
        "stack-lg": "24px",
        "stack-md": "16px",
        gutter: "16px",
        "sidebar-width": "240px",
        unit: "4px",
        "stack-xs": "4px",
        "stack-sm": "8px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      },
      fontSize: {
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "display-md": ["24px", { lineHeight: "32px", letterSpacing: "0", fontWeight: "600" }],
        "display-lg": ["30px", { lineHeight: "38px", letterSpacing: "0", fontWeight: "600" }]
      }
    }
  },
  plugins: []
};

export default config;
