import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useAtom } from "@effect/atom-react";
import { Match } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { Eye, EyeOff } from "lucide-react";
import { type ReactNode, useId } from "react";

import { fieldStatusProps, inputAttributes } from "#lib/form";

/** Whether each password field shows its text, keyed by the field's React id. */
const shownAtom = Atom.family((_fieldId: string) => Atom.make(false));

const showIcon = <Eye aria-hidden size="1em" />;
const hideIcon = <EyeOff aria-hidden size="1em" />;

/**
 * A password field with a show/hide eye button inside it (web.dev sign-in
 * guide: let people check what they typed, instead of a confirm field). The
 * button's label says what it will do, so screen readers announce "Show
 * password" or "Hide password". The button sits after the input, at the
 * box's inline end (the Astryx patch adds `endContent`), so Tab reaches the
 * password first. Shown as text, it still gets no phone capitals or
 * corrections.
 */
export const PasswordInput = ({
  autoComplete,
  errors,
  hideLabel,
  name,
  showLabel,
  ...field
}: {
  readonly autoComplete: "current-password" | "new-password";
  /** The rule under the label; none when signing in. */
  readonly description?: string;
  /** The field's TanStack Form errors; the first shows under the field. */
  readonly errors: ReadonlyArray<{ readonly message: string }>;
  readonly hideLabel: string;
  readonly label: string;
  readonly name: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly showLabel: string;
  readonly value: string;
}) => {
  const [isShown, setShown] = useAtom(shownAtom(useId()));
  const shown = Match.value(isShown).pipe(
    Match.withReturnType<{
      readonly icon: ReactNode;
      readonly label: string;
      readonly type: "password" | "text";
    }>(),
    Match.when(true, () => ({
      icon: hideIcon,
      label: hideLabel,
      type: "text",
    })),
    Match.orElse(() => ({ icon: showIcon, label: showLabel, type: "password" }))
  );
  return (
    <TextInput
      {...field}
      endContent={
        <Button
          icon={shown.icon}
          isIconOnly
          label={shown.label}
          onClick={() => setShown(!isShown)}
          size="sm"
          variant="ghost"
        />
      }
      htmlName={name}
      ref={inputAttributes({
        autocapitalize: "none",
        autocomplete: autoComplete,
        autocorrect: "off",
        enterkeyhint: "go",
        required: "",
        spellcheck: "false",
      })}
      size="lg"
      {...fieldStatusProps(errors)}
      type={shown.type}
      width="100%"
    />
  );
};
