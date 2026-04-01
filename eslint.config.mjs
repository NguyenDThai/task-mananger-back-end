import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import";

export default [
  // 1. Files / Folder ignoring (Replaces .eslintignore)
  {
    ignores: ["node_modules/", "dist/", ".env", ".husky/", "**/test/**", "lint_output.txt"],
  },

  // 2. Base Configuration
  js.configs.recommended,
  configPrettier,

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: pluginImport,
      prettier: prettier,
    },
    rules: {
      // Console log is key for backend
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^next" }],
      "no-var": "error",
      "prefer-const": "error",

      // Importing standards
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      // Prettier Integration
      "prettier/prettier": "error",
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".json"],
        },
      },
    },
  },
];
