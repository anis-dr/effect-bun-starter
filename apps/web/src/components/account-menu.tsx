import { Button } from "@astryxdesign/core/Button";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@astryxdesign/core/DropdownMenu";
import { useAtomSet, useAtomSubscribe } from "@effect/atom-react";
import { useMatch, useRouter } from "@tanstack/react-router";
import { Match, Option } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { LogOut, UserRound } from "lucide-react";
import { useRef } from "react";

import { signOutAtom } from "#lib/auth-client";
import type { Session } from "#lib/session-state";

import { type Locale, messages } from "../i18n";
import { focusOnMount } from "./split-screen";

const userIcon = <UserRound aria-hidden size="1em" />;
const signedOut: Session = { signedIn: false };

/**
 * The header's account control, icon only. Signed out, it opens sign-in.
 * Signed in, named after the account, it opens a menu with sign-out, which
 * stays on the current page. The state comes from the `/$locale` loader,
 * read on the server, so the first paint is already right.
 */
export const AccountMenu = ({ locale }: { readonly locale: Locale }) => {
  const copy = messages[locale];
  const router = useRouter();
  const signOut = useAtomSet(signOutAtom);
  // The trigger that had focus leaves with the signed-in state; the sign-in
  // button that replaces it takes focus instead of the page.
  const isSigningOut = useRef(false);
  // Signing out changes what the server renders: re-run the loaders.
  useAtomSubscribe(signOutAtom, (result) => {
    if (AsyncResult.isSuccess(result)) {
      isSigningOut.current = true;
      void router.invalidate();
    }
  });
  // A path with no locale gets the root's 404, outside `/$locale`: signed
  // out.
  const session = Option.getOrElse(
    Option.fromUndefinedOr(
      useMatch({
        from: "/$locale",
        select: (match) => match.loaderData,
        shouldThrow: false,
      })
    ),
    () => signedOut
  );

  return Match.value(session).pipe(
    Match.when({ signedIn: true }, ({ user }) => (
      <DropdownMenu
        button={{
          icon: userIcon,
          isIconOnly: true,
          label: user.name,
          variant: "ghost",
        }}
        hasChevron={false}
        menuWidth="15rem"
      >
        <DropdownMenuItem
          icon={LogOut}
          label={copy.signOut}
          onClick={() => signOut()}
        />
      </DropdownMenu>
    )),
    Match.orElse(() => (
      <Button
        href={`/${locale}/sign-in`}
        icon={userIcon}
        isIconOnly
        label={copy.signIn}
        ref={(element) => {
          if (isSigningOut.current) {
            isSigningOut.current = false;
            focusOnMount(element);
          }
        }}
        variant="ghost"
      />
    ))
  );
};
