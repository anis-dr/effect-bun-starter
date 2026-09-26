export type EmailLocale = "en" | "fr";

/** The locales emails are written in; the first is the fallback. */
export const emailLocales: readonly EmailLocale[] = ["en", "fr"];

/** The words of an email built on `LinkEmail`. */
export interface LinkEmailCopy {
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
    verifyEmail: {
      action: "Confirm my email",
      body: (appName) =>
        `Confirm that this address is yours to finish setting up your ${appName} account.`,
      expiry: "This link expires in one hour.",
      greeting: (name) => `Hello ${name},`,
      ignore:
        "If you didn't create an account, ignore this email: nothing changes until the address is confirmed.",
      preview: (appName) => `Confirm your email for your ${appName} account.`,
      subject: "Confirm your email",
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
    verifyEmail: {
      action: "Confirmer mon adresse",
      body: (appName) =>
        `Confirmez que cette adresse est bien la vôtre pour terminer la création de votre compte ${appName}.`,
      expiry: "Ce lien expire dans une heure.",
      greeting: (name) => `Bonjour ${name},`,
      ignore:
        "Si vous n’avez pas créé de compte, ignorez cet e-mail : rien ne change tant que l’adresse n’est pas confirmée.",
      preview: (appName) =>
        `Confirmez votre adresse e-mail pour votre compte ${appName}.`,
      subject: "Confirmez votre adresse e-mail",
    },
  },
} satisfies Record<
  EmailLocale,
  {
    readonly resetPassword: LinkEmailCopy;
    readonly verifyEmail: LinkEmailCopy;
  }
>;
