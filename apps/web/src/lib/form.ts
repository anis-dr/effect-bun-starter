import type { TextInputStatus } from "@astryxdesign/core/TextInput";
import { colorVars } from "@astryxdesign/core/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { createErrorVisibility, createValidator } from "@tanstack/react-form";
import { Option, Schema } from "effect";
import type { RefCallback } from "react";

/**
 * Validation timing for every form (web.dev forms guide): a field's error
 * appears once the user leaves it or tries to submit, then follows their
 * typing, so a correction clears it at once. A blocked submit moves focus to
 * the first field in error.
 */

/** The form's Effect Schema as a TanStack Form validator, run on every change
 * and blur (and on submit, where its decoded output is `schemaOutputs[0]`). */
export const schemaValidator = <S extends Schema.Decoder<unknown>>(schema: S) =>
  createValidator({ triggers: ["change", "blur"] })(
    Schema.toStandardSchemaV1(schema)
  );

/** Form `errorVisibility`: hide a field's errors until it is left or the form is submitted. */
export const afterBlurOrSubmit = createErrorVisibility(
  ({ state, fieldState }) =>
    fieldState.meta.isBlurred || state.submissionAttempts > 0
);

/** Form `onSubmitInvalid`: focus the first control in error, in page order. */
export function focusFirstInvalid(form: Option.Option<HTMLFormElement>): void {
  Option.map(
    Option.flatMap(form, (element) =>
      Option.fromNullishOr(
        element.querySelector<HTMLElement>('[aria-invalid="true"]')
      )
    ),
    (control) => control.focus()
  );
}

// Astryx's error status swaps the control's shadow for `none`, so a focused
// control in error loses the inner focus ring every other control has. Put it
// back in the error colour (ADR 0015 step 4). This keys the same property as
// Astryx, replacing its grey error hover ring too: StyleX ranks `:hover`
// above `:focus-within`, so keeping it would turn the focus ring grey under
// the pointer. The red border already marks the field.
const statusStyles = stylex.create({
  error: {
    boxShadow: {
      ":focus-within": `inset 0 0 0 0.125rem ${colorVars["--color-error-muted"]}`,
      default: "none",
    },
  },
});

/** Astryx `status` for a control's first error; the message sits under it. */
export const fieldStatusProps = (
  errors: ReadonlyArray<{ readonly message: string }>
): { readonly status?: TextInputStatus; readonly xstyle?: StyleXStyles } =>
  Option.match(Option.fromUndefinedOr(errors[0]), {
    onNone: () => ({}),
    onSome: ({ message }) => ({
      status: { message, type: "error" },
      xstyle: statusStyles.error,
    }),
  });

// ponytail: Astryx TextInput has no `autoComplete` or `enterKeyHint` prop, so
// set them on the input it renders; password managers and phone keyboards
// read them. `required` goes here too: Astryx's `isRequired` prints a
// hard-coded English "Required" beside the label. Forms set `noValidate`, so
// it only tells assistive tech; the schema owns the messages.
export const inputAttributes =
  (
    attributes: Readonly<Record<string, string>>
  ): RefCallback<HTMLInputElement | HTMLTextAreaElement> =>
  (input) => {
    for (const [name, value] of Object.entries(attributes)) {
      input?.setAttribute(name, value);
    }
  };
