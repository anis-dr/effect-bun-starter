export type EmailLocale = "en" | "fr";

/** The locales emails are written in; the first is the fallback. */
export const emailLocales: readonly EmailLocale[] = ["en", "fr"];

interface ResetPasswordCopy {
  readonly action: string;
  readonly body: (appName: string) => string;
  readonly expiry: string;
  readonly greeting: (name: string) => string;
  readonly ignore: string;
  readonly preview: (appName: string) => string;
  readonly subject: string;
}

export const emailCopy = {
  en: {
    resetPassword: {
      action: "Reset my password",
      body: (appName) =>
        `We received a request to reset the password for your ${appName} account. Use the button to choose a new one.`,
      expiry: "This link works once and expires in one hour.",
      greeting: (name) => `Hello ${name},`,
      ignore:
        "If you didn't ask for this, ignore this email: your password stays the same.",
      preview: (appName) =>
        `Choose a new password for your ${appName} account.`,
      subject: "Reset your password",
    },
  },
  fr: {
    resetPassword: {
      action: "Réinitialiser mon mot de passe",
      body: (appName) =>
        `Nous avons reçu une demande de réinitialisation du mot de passe de votre compte ${appName}. Utilisez le bouton pour en choisir un nouveau.`,
      expiry: "Ce lien ne sert qu’une fois et expire dans une heure.",
      greeting: (name) => `Bonjour ${name},`,
      ignore:
        "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.",
      preview: (appName) =>
        `Choisissez un nouveau mot de passe pour votre compte ${appName}.`,
      subject: "Réinitialisez votre mot de passe",
    },
  },
} satisfies Record<EmailLocale, { readonly resetPassword: ResetPasswordCopy }>;
