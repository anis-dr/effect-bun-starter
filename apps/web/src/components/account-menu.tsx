import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@astryxdesign/core/DropdownMenu";
import { useAtomSet, useAtomSubscribe } from "@effect/atom-react";
import { useMatch, useRouter } from "@tanstack/react-router";
import { Boolean, Match, Option } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { LogOut, UserRound } from "lucide-react";
import { useRef } from "react";

import { signOutAtom } from "#lib/auth-client";
import type { Session, SignedIn } from "#lib/session-state";

import { type Locale, messages } from "../i18n";
import { focusOnMount } from "./split-screen";

const userIcon = <UserRound aria-hidden size="1em" />;
const signedOut: Session = { signedIn: false };

/** The account's avatar, else the generic person icon. */
const accountIcon = (user: SignedIn["user"]) =>
  Option.match(Option.fromNullishOr(user.image), {
    onNone: () => userIcon,
    onSome: (image) => (
      <Avatar name={user.name} size="sm" src={image} tooltip={false} />
    ),
  });

/**
 * The header's account control, icon only. Signed out, it opens sign-in.
 * Signed in, named after the account and showing its avatar when it has
 * one, it opens a menu with the account page and sign-out. The state comes
 * from the `/$locale` loader, read on the server, so the first paint is
 * already right.
 */
export const AccountMenu = ({ locale }: { readonly locale: Locale }) => {
  const copy = messages[locale];
  const router = useRouter();
  const signOut = useAtomSet(signOutAtom);
  // The trigger that had focus leaves with the signed-in state; the sign-in
  // button that replaces it takes focus instead of the page.
  const isSigningOut = useRef(false);
  // Signing out changes what the server renders: re-run the loaders. A
  // signed-in page has nothing left to show, so it goes home instead, as a
  // document load that drops its data from memory.
  useAtomSubscribe(signOutAtom, (result) => {
    if (AsyncResult.isSuccess(result)) {
      isSigningOut.current = true;
      Boolean.match(
        router.state.matches.some(
          (match) =>
            match.staticData.isPrivate === true &&
            match.routeId !== "/$locale/sign-in"
        ),
        {
          onFalse: () => void router.invalidate(),
          onTrue: () =>
            void router.navigate({ href: `/${locale}`, reloadDocument: true }),
        }
      );
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
          icon: accountIcon(user),
          isIconOnly: true,
          label: user.name,
          variant: "ghost",
        }}
        hasChevron={false}
        menuWidth="15rem"
      >
        <DropdownMenuItem
          icon={UserRound}
          label={copy.account}
          onClick={() => void router.navigate({ href: `/${locale}/account` })}
        />
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
