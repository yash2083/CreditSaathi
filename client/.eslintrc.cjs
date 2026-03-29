module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react", "react-refresh"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "warn",
    "react-refresh/only-export-components": "warn",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": "warn",
    "prefer-const": "error",
  },
  ignorePatterns: ["node_modules/", "dist/", "coverage/"],
};
