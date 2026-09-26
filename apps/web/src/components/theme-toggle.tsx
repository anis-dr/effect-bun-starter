import { Button } from "@astryxdesign/core/Button";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { useLoaderData } from "@tanstack/react-router";
import { Boolean, Effect, Option } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { Moon, Sun } from "lucide-react";

import {
  type PinnedScheme,
  pinnedScheme,
  setThemeMode,
  type ThemeMode,
} from "#lib/theme-mode";

import { type Locale, messages } from "../i18n";

const light: PinnedScheme = "light";
const dark: PinnedScheme = "dark";
const followSystem: ThemeMode = "system";
const sun = <Sun aria-hidden size="1em" />;
const moon = <Moon aria-hidden size="1em" />;

/** The choice made in this tab, shown at once; none until the first click.
 * It wins over the root loader's mode, which only knew the cookie at page
 * load. It is never cleared: clearing it after a reload of the root loader
 * let one frame paint the old mode before the router committed the new
 * one. */
export const chosenThemeAtom = Atom.make(Option.none<ThemeMode>());

/** Shows the choice at once and saves it in its cookie for the next page
 * load; nothing on this page needs the server to re-render for it. */
const chooseThemeAtom = Atom.fn(
  Effect.fn("ThemeToggle.choose")(function* (
    next: ThemeMode,
    get: Atom.FnContext
  ) {
    get.set(chosenThemeAtom, Option.some(next));
    yield* Effect.promise(() => setThemeMode({ data: next }));
  })
);

// Following the system, the server can't know the scheme, so both buttons
// are rendered and the media query shows the right one: no icon flip at
// hydration.
const schemeStyles = stylex.create({
  whenDark: {
    display: {
      "@media (prefers-color-scheme: dark)": "inline-flex",
      default: "none",
    },
  },
  whenLight: {
    display: {
      "@media (prefers-color-scheme: dark)": "none",
      default: "inline-flex",
    },
  },
});

/**
 * Colour-scheme icon button in the header. Two states: follow the system,
 * or pin the opposite scheme; a pinned scheme stays pinned when the system
 * later changes. The icon shows the scheme on screen; the label names what a
 * click does.
 */
export const ThemeToggle = ({ locale }: { readonly locale: Locale }) => {
  const copy = messages[locale];
  const loaded = useLoaderData({ from: "__root__" });
  const mode = Option.getOrElse(useAtomValue(chosenThemeAtom), () => loaded);
  const chooseTheme = useAtomSet(chooseThemeAtom);
  // Keyed by the system scheme each button is shown under, so a click keeps
  // the same element and its focus: pinning happens under the opposite
  // system scheme, and the pinned button takes that slot's key.
  // ponytail: if the system flips while pinned, unpinning lands focus on
  // the hidden twin; key by the live media query if that ever matters.
  const button = (
    shown: PinnedScheme,
    next: ThemeMode,
    label: string,
    xstyle: StyleXStyles,
    system: PinnedScheme
  ) => (
    <Button
      icon={Boolean.match(shown === dark, {
        onFalse: () => sun,
        onTrue: () => moon,
      })}
      isIconOnly
      key={system}
      label={label}
      onClick={() => chooseTheme(next)}
      variant="ghost"
      xstyle={xstyle}
    />
  );
  // Pinned: go back to the system. Following the system: pin the opposite.
  return Option.match(pinnedScheme(mode), {
    onNone: () => (
      <>
        {button(light, dark, copy.themeUseDark, schemeStyles.whenLight, light)}
        {button(dark, light, copy.themeUseLight, schemeStyles.whenDark, dark)}
      </>
    ),
    onSome: (scheme) =>
      button(
        scheme,
        followSystem,
        copy.themeMatchSystem,
        [],
        Boolean.match(scheme === dark, {
          onFalse: () => dark,
          onTrue: () => light,
        })
      ),
  });
};
