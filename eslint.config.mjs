import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", "dist/**", "out/**", "coverage/**", "node_modules/**"],
  },
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "import/no-anonymous-default-export": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: ["app/components/weeklyDecisionCard.tsx", "lib/report/homePageAssembler.ts"],
    rules: {
      "max-lines": ["error", { max: 900, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["lib/report/home/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["../app/*", "../../app/*", "../../../app/*", "app/*"],
      }],
    },
  },
];

export default config;
