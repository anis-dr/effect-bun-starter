import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  colorVars,
  radiusVars,
  spacingVars,
} from "@astryxdesign/core/theme/tokens.stylex";
import { VStack } from "@astryxdesign/core/VStack";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import type { ReactNode, RefCallback } from "react";

import { type Locale, messages } from "../i18n";
import { LanguageMenu } from "./language-menu";
import { ThemeToggle } from "./theme-toggle";

// Split-screen frame for signing in (ADR 0015 step 4): Astryx has no
// two-pane page without a shell. The side panel shows from 64rem up; below
// that the form stands alone at the top, so a phone keyboard never hides the
// button. A project puts its own art in the panel.
const splitStyles = stylex.create({
  page: {
    backgroundColor: colorVars["--color-background-body"],
    display: "grid",
    gridTemplateColumns: {
      "@media (min-width: 64rem)": "minmax(0, 1fr) minmax(0, 1fr)",
      default: "minmax(0, 1fr)",
    },
    minBlockSize: "100dvh",
  },
  panel: {
    backgroundColor: colorVars["--color-background-muted"],
    blockSize: `calc(100dvh - 2 * ${spacingVars["--spacing-3"]})`,
    borderRadius: radiusVars["--radius-container"],
    display: { "@media (min-width: 64rem)": "block", default: "none" },
    insetBlockStart: spacingVars["--spacing-3"],
    margin: spacingVars["--spacing-3"],
    position: "sticky",
  },
  // A fixed top rather than vertical centring, so an error appearing grows
  // the form downward and nothing above it moves.
  form: {
    marginBlockStart: {
      "@media (min-width: 64rem)": "clamp(2rem, 12vh, 8rem)",
      default: 0,
    },
    marginInline: "auto",
  },
});

/** Text links on the auth pages: a 44 px tall hit area on touch screens
 * without moving the text. */
export const touchTarget = stylex.create({
  link: {
    marginBlock: {
      "@media (pointer: coarse)": `calc(-1 * ${spacingVars["--spacing-3"]})`,
      default: 0,
    },
    paddingBlock: {
      "@media (pointer: coarse)": spacingVars["--spacing-3"],
      default: 0,
    },
  },
});

/** A message that takes focus from script is not a control: no focus ring. */
export const focusedMessage = stylex.create({ target: { outline: "none" } });

/** Ref for a message that replaces a submitted form's focus, such as a
 * refusal banner or a "check your email" heading: it takes focus once, when
 * it appears, so keyboard and screen-reader users land on it. */
export const focusOnMount: RefCallback<HTMLElement> = (element) => {
  Option.map(Option.fromNullishOr(element), (target) => target.focus());
};

/** Header-less page: app name and controls over the form, a neutral panel
 * beside it. */
export const SplitScreen = ({
  children,
  locale,
}: {
  readonly children: ReactNode;
  readonly locale: Locale;
}) => (
  <main {...stylex.props(splitStyles.page)}>
    <VStack gap={6} padding={6}>
      <HStack align="center" gap={1}>
        <StackItem size="fill">
          <Link hasUnderline={false} href={`/${locale}`}>
            <Text type="label" weight="semibold">
              {messages[locale].appName}
            </Text>
          </Link>
        </StackItem>
        <LanguageMenu locale={locale} />
        <ThemeToggle locale={locale} />
      </HStack>
      <VStack
        maxWidth="24rem"
        paddingBlock={8}
        width="100%"
        xstyle={splitStyles.form}
      >
        {children}
      </VStack>
    </VStack>
    <div aria-hidden {...stylex.props(splitStyles.panel)} />
  </main>
);
