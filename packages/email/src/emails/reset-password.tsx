import { emailCopy } from "../copy.js";
import { LinkEmail, type LinkEmailProps } from "../link-email.js";

/** "Reset your password", in the account's language. */
export const ResetPasswordEmail = (props: LinkEmailProps) => (
  <LinkEmail {...props} copy={emailCopy[props.locale].resetPassword} />
);

// The react-email preview server (`bun run email:dev`) renders the default
// export with these props.
ResetPasswordEmail.PreviewProps = {
  appName: "App",
  locale: "en",
  name: "Alex",
  url: "http://localhost:3002/api/auth/reset-password/preview-token",
} satisfies LinkEmailProps;

export default ResetPasswordEmail;
