import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

import type { EmailLocale, LinkEmailCopy } from "./copy.js";

/** What every link email shows: the account and the link it acts on. */
export interface LinkEmailProps {
  /** The product's name, shown above the card and in the copy (`APP_NAME`). */
  readonly appName: string;
  readonly locale: EmailLocale;
  readonly name: string;
  /** The single-use link the button opens. */
  readonly url: string;
}

// Neutral palette: a project swaps in its brand here. Email clients need
// literal values, not CSS variables.
const colors = {
  accent: "#111827",
  border: "#e5e7eb",
  page: "#f3f4f6",
  secondary: "#6b7280",
  surface: "#ffffff",
  text: "#111827",
};

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** A card with one action: the layout of the emails that carry a
 * single-use link (reset a password, confirm an address), in `copy`'s
 * language. */
export const LinkEmail = ({
  appName,
  copy,
  locale,
  name,
  url,
}: LinkEmailProps & { readonly copy: LinkEmailCopy }) => (
  <Html dir="ltr" lang={locale}>
    <Head />
    <Preview>{copy.preview(appName)}</Preview>
    <Body
      style={{
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily,
        margin: 0,
        padding: "32px 16px",
      }}
    >
      <Container style={{ maxWidth: 480 }}>
        <Text style={{ fontSize: 18, fontWeight: 600, margin: "0 0 24px" }}>
          {appName}
        </Text>
        <Section
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 32,
          }}
        >
          <Heading
            as="h1"
            style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px" }}
          >
            {copy.subject}
          </Heading>
          <Text style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 8px" }}>
            {copy.greeting(name)}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 24px" }}>
            {copy.body(appName)}
          </Text>
          <Button
            href={url}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 8,
              color: "#ffffff",
              display: "block",
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 24px",
              textAlign: "center",
            }}
          >
            {copy.action}
          </Button>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              lineHeight: 1.5,
              margin: "24px 0 0",
            }}
          >
            {copy.expiry}
          </Text>
          <Hr style={{ borderColor: colors.border, margin: "24px 0" }} />
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {copy.ignore}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
