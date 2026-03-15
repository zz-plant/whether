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
];

export default config;
