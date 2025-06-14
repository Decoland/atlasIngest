import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = {
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  rules: {
    ...eslint.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    "prefer-const": "warn",
    "no-constant-binary-expression": "error",

    // Disable no-undef as TypeScript handles this better
    "no-undef": "off",
    "@typescript-eslint/no-unsafe-function-type": "off",
    // Customize TypeScript rules
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
        "error",
        {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true,
        },
    ],
},
};

export default eslintConfig;
