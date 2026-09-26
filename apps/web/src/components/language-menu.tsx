import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@astryxdesign/core/DropdownMenu";
import { useLocation, useRouter } from "@tanstack/react-router";
import { Option } from "effect";
import { Languages } from "lucide-react";

import { setLocalePreference } from "#lib/locale-preference";

import {
  isLocale,
  type Locale,
  localeNames,
  locales,
  messages,
  switchLocale,
} from "../i18n";

/**
 * Language control: an icon button opening a radio list of languages, each
 * in its own name. Switching keeps the rest of the path and query, opens the
 * page in the new language and saves the choice for the next visit to `/`.
 */
export const LanguageMenu = ({ locale }: { readonly locale: Locale }) => {
  const path = useLocation({
    select: (location) => `${location.pathname}${location.searchStr}`,
  });
  const router = useRouter();
  const label = messages[locale].language;
  const choose = (next: string) =>
    Option.map(Option.liftPredicate(next, isLocale), (to) => {
      void setLocalePreference({ data: to });
      void router.navigate({ href: switchLocale(path, to) });
    });
  return (
    <DropdownMenu
      button={{
        icon: <Languages aria-hidden size="1em" />,
        isIconOnly: true,
        label,
        variant: "ghost",
      }}
      hasChevron={false}
      menuWidth="12.5rem"
    >
      <DropdownMenuRadioGroup label={label} onChange={choose} value={locale}>
        {locales.map((next) => (
          <DropdownMenuRadioItem
            key={next}
            // Each name is in its own language.
            label={<span lang={next}>{localeNames[next]}</span>}
            value={next}
          />
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenu>
  );
};
