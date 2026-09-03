import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const inheritedPlugins = Object.assign(
  {},
  ...[...nextCoreWebVitals, ...nextTypeScript].map(
    (configuration) => configuration.plugins || {},
  ),
);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      ".next/**",
      "**/.netlify/**",
      "node_modules/**",
      "playwright-report/**",
      "scripts/**",
      "test-results/**",
      "public/pdf.worker.min.mjs",
    ],
  },
  {
    plugins: inheritedPlugins,
    rules: {
      // The existing application predates the stricter React 19/Next 16 rule
      // set. Keep that debt visible without making the release gate unusable;
      // new TypeScript/build failures still fail CI and these remain warnings.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
