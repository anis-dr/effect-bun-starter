import { emailCopy } from "../copy.js";
import { LinkEmail, type LinkEmailProps } from "../link-email.js";

/** "Confirm your email", in the language of the page the account signed up
 * on. */
export const VerifyEmailEmail = (props: LinkEmailProps) => (
  <LinkEmail {...props} copy={emailCopy[props.locale].verifyEmail} />
);

// The react-email preview server (`bun run email:dev`) renders the default
// export with these props.
VerifyEmailEmail.PreviewProps = {
  appName: "App",
  locale: "en",
  name: "Alex",
  url: "http://localhost:3002/api/auth/verify-email?token=preview-token&callbackURL=%2Fen",
} satisfies LinkEmailProps;

export default VerifyEmailEmail;
