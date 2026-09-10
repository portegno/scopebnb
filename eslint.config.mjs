import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /**
   * No em dashes in copy that goes out with the house name.
   *
   * It is a house rule -- "Inglés, sin guiones largos, sin segunda persona" --
   * and it lived only inside a prompt, so it bound the agents writing blog
   * posts and nobody else. The landings were written by hand and broke it on
   * the first try, in the sentence carrying the whole offer: "$300 for the week
   * — across a membership...".
   *
   * A rule that only exists in a prompt binds whoever reads that prompt. This
   * one now fails the lint, which is where a rule stops depending on memory.
   *
   * Comments are exempt: this is about what a reader sees, and the reasoning
   * next to the code is not that.
   */
  {
    files: ["src/app/(landing)/**/*.tsx", "src/components/landing/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/—/]",
          message: "Sin guiones largos: es estilo de la casa. Decidí qué tapaba el guión (una "
                 + "coma, un punto, un 'que') y escribí eso.",
        },
        {
          selector: "JSXText[value=/—/]",
          message: "Sin guiones largos: es estilo de la casa. Decidí qué tapaba el guión (una "
                 + "coma, un punto, un 'que') y escribí eso.",
        },
        {
          selector: "TemplateElement[value.raw=/—/]",
          message: "Sin guiones largos: es estilo de la casa.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
