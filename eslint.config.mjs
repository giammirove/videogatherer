
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

let myrules = [{
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    }],
  },
}];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...myrules
);
