import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginNext from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Migrations and standalone scripts run outside Next's compiler.
  {
    ignores: [".next/**", "node_modules/**", "db/**", "scripts/**", "*.config.*"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Registering the plugin directly is what Next's build step looks for.
    plugins: { "@next/next": pluginNext },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
];

export default eslintConfig;
