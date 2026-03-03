import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["node_modules/**"],
    rules: {
      // Allow setState in useEffect for initial data fetching
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
