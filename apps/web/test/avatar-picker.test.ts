// @vitest-environment jsdom
import { assert, it } from "@effect/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { createElement } from "react";

import { AvatarPicker } from "../src/components/avatar-picker.js";
import { messages } from "../src/i18n.js";
import { describedAs, renderPage } from "./render.js";

const hint = "JPEG, PNG or WebP, up to 5\u00a0MB.";

it.effect(
  "says why a new photo was refused, not that the last one was saved",
  () =>
    Effect.gen(function* () {
      yield* renderPage(
        createElement(AvatarPicker, {
          copy: messages.en,
          user: {
            email: "ada@example.com",
            emailVerified: true,
            id: "user-1",
            name: "Ada",
          },
        }),
        {
          "PUT /account/avatar": () =>
            Response.json({ image: "http://localhost/uploads/ada.webp" }),
        }
      );
      const picker = yield* Effect.promise(() =>
        screen.findByRole("button", { name: "Upload a photo" })
      );
      // What the browser's file dialog fills: the input beside the button.
      const choose = (file: File) =>
        fireEvent.change(
          picker
            .closest("[data-pressable-container]")
            ?.querySelector("input") ?? picker,
          { target: { files: [file] } }
        );
      const pickerSays = (expected: string) =>
        Effect.promise(() =>
          waitFor(() => {
            assert.strictEqual(describedAs(picker), expected);
          })
        );

      choose(new File(["png"], "ada.png", { type: "image/png" }));
      yield* pickerSays(`${hint} Photo saved.`);
      choose(new File(["text"], "notes.txt", { type: "text/plain" }));

      yield* pickerSays(`${hint} "notes.txt" is not an accepted file type`);
    })
);
