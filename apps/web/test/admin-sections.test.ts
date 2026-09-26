// @vitest-environment jsdom
import { assert, it } from "@effect/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { createElement } from "react";

import { Admins, CreateStore } from "../src/components/admin-sections.js";
import { messages } from "../src/i18n.js";
import { describedAs, renderPage } from "./render.js";

/** Types `value` into the field labelled `label`, submits its form and
 * resolves with what the field then says after its name. */
const submitted = Effect.fn("AdminSectionsTest.submitted")(function* (
  label: string,
  value: string,
  expected: string
) {
  const field = yield* Effect.promise(() => screen.findByLabelText(label));
  fireEvent.change(field, { target: { value } });
  fireEvent.submit(field.closest("form") ?? field);
  yield* Effect.promise(() =>
    waitFor(() => {
      assert.strictEqual(field.getAttribute("aria-invalid"), "true");
    })
  );
  assert.strictEqual(describedAs(field), expected);
});

it.effect("says on the name field that a store already has the name", () =>
  Effect.gen(function* () {
    yield* renderPage(createElement(CreateStore, { copy: messages.fr }), {
      "POST /stores": () =>
        Response.json(
          { _tag: "StoreNameTaken", message: "Store name taken" },
          { status: 409 }
        ),
    });

    yield* submitted("Nom", "Café", "Une boutique porte déjà ce nom.");
  })
);

it.effect.each([
  [
    "no account uses the email",
    404,
    "AccountNotFound",
    "Aucun compte n’utilise cet e-mail.",
  ],
  [
    "the account's email is unconfirmed",
    409,
    "AccountNotVerified",
    "Ce compte n’a pas encore confirmé son e-mail. Demandez à la personne d’ouvrir le lien reçu.",
  ],
] satisfies ReadonlyArray<readonly [string, number, string, string]>)(
  "says on the email field when %s",
  ([, status, tag, refusal]) =>
    Effect.gen(function* () {
      yield* renderPage(createElement(Admins, { copy: messages.fr }), {
        "GET /admin/admins": () => Response.json([]),
        "POST /admin/admins": () =>
          Response.json({ _tag: tag, message: tag }, { status }),
      });

      yield* submitted(
        "E-mail du compte",
        "ada@example.com",
        `La personne doit d’abord avoir un compte à l’e-mail confirmé. ${refusal}`
      );
    })
);
