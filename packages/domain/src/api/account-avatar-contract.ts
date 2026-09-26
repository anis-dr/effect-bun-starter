import { Schema } from "effect";
import { Multipart } from "effect/unstable/http";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { Authentication } from "./authentication.js";

/** The largest image upload accepted, in bytes. */
export const maxImageBytes = 5 * 1024 * 1024;

export class ImageTooLarge extends Schema.TaggedError<ImageTooLarge>()(
  "ImageTooLarge",
  { message: Schema.String }
) {}

/** Not a JPEG, PNG or WebP that decodes. */
export class UnsupportedImage extends Schema.TaggedError<UnsupportedImage>()(
  "UnsupportedImage",
  { message: Schema.String }
) {}

export class AccountUnavailable extends Schema.TaggedError<AccountUnavailable>()(
  "AccountUnavailable",
  { message: Schema.String }
) {}

/** A multipart form with the image file in the `image` field. */
export const SetAvatarRequest = Schema.Struct({
  image: Multipart.SingleFileSchema,
}).pipe(HttpApiSchema.asMultipart());

/** `image`: the account's new avatar URL, also Better Auth's `user.image`. */
export const AvatarResponse = Schema.Struct({ image: Schema.String });

const UnavailableResponse = HttpApiSchema.status(503)(AccountUnavailable);

export const Group = HttpApiGroup.make("accountAvatar")
  .add(
    HttpApiEndpoint.put("set", "/account/avatar", {
      error: [
        HttpApiSchema.status(413)(ImageTooLarge),
        HttpApiSchema.status(422)(UnsupportedImage),
        UnavailableResponse,
      ],
      payload: SetAvatarRequest,
      success: AvatarResponse,
    })
  )
  .add(
    HttpApiEndpoint.delete("remove", "/account/avatar", {
      error: UnavailableResponse,
      success: HttpApiSchema.NoContent,
    })
  )
  .middleware(Authentication);
