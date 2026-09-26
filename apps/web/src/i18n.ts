import { Array as Arr, Boolean, Option, Order } from "effect";

/** The app's languages. Adding one is a row here, in `localeNames`,
 * `messages` and `astryx-messages.ts`. */
export const locales = ["en", "fr"] satisfies readonly ["en", "fr"];

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const isLocale = (value: string): value is Locale =>
  locales.some((locale) => locale === value);

/** Cookie keeping the language the visitor picked (or was given) last.
 * Over HTTPS it takes the `__Host-` prefix, which binds it to this host and
 * requires `Secure`; browsers refuse that prefix on `http://localhost`, so
 * plain-http dev keeps the bare name. */
export const localeCookieName = (isHttps: boolean) =>
  Boolean.match(isHttps, {
    onFalse: () => "locale",
    onTrue: () => "__Host-locale",
  });

/** One `Accept-Language` range as a supported locale and its weight. */
const weightedLocale = (range: string) => {
  const [tag = "", ...params] = range.split(";");
  const [family = ""] = tag.trim().toLowerCase().split("-");
  const quality = Option.getOrElse(
    Option.map(
      Arr.findFirst(params, (param) => param.trim().startsWith("q=")),
      (param) => Number(param.trim().slice(2))
    ),
    () => 1
  );
  return Option.filter(
    Option.map(
      Option.liftPredicate(family, isLocale),
      (locale) => [locale, quality] satisfies readonly [Locale, number]
    ),
    ([, weight]) => weight > 0
  );
};

/**
 * The locale for the locale-less entry `/`: a valid saved choice, else the
 * best-weighted supported language family in `Accept-Language` (ties keep
 * header order), else the default.
 */
export const negotiateLocale = (
  preference: Option.Option<string>,
  acceptLanguage: Option.Option<string>
): Locale =>
  Option.getOrElse(
    Option.orElse(Option.filter(preference, isLocale), () =>
      Option.flatMap(acceptLanguage, (header) =>
        Option.map(
          Arr.head(
            Arr.sortWith(
              Arr.getSomes(header.split(",").map(weightedLocale)),
              ([, weight]) => weight,
              Order.flip(Order.Number)
            )
          ),
          ([locale]) => locale
        )
      )
    ),
    () => defaultLocale
  );

const localePrefix = new RegExp(`^/(${locales.join("|")})(?=[/?#]|$)`);

/**
 * `path` (pathname and search) in another language: the first segment
 * becomes `to`, and so does the first segment of a `?redirect=` path, since
 * the visitor chose the language for where they go next too.
 */
export const switchLocale = (path: string, to: Locale): string => {
  // ponytail: any fixed origin; only the path and search come back out.
  const url = new URL(path, "https://app.invalid");
  const rest = url.pathname.split("/").slice(2).join("/");
  Option.map(Option.fromNullOr(url.searchParams.get("redirect")), (target) =>
    url.searchParams.set("redirect", target.replace(localePrefix, `/${to}`))
  );
  return `/${to}/${rest}${url.search}`;
};

/** Native language names for the language menu; never translated. */
export const localeNames = {
  en: "English",
  fr: "Français",
} satisfies Record<Locale, string>;

const english = {
  account: "Account",
  accountName: "Name",
  accountNamePlaceholder: "Your full name",
  accountNameRequired: "Enter your name.",
  apiChecking: "API checking",
  apiStatus: "API {status}",
  apiUnavailable: "API unavailable",
  appName: "Effect Bun Starter",
  authAccountExists: "An account already uses this email. Sign in instead.",
  authenticationFailed: "That didn’t work. Try again.",
  authInvalidCredentials: "The email or password is incorrect.",
  authPasswordTooLong: "Use at most 128 characters.",
  authTooManyAttempts: "Too many attempts. Wait a minute, then try again.",
  backHome: "Back to home",
  backToSignIn: "Back to sign in",
  createAccount: "Create an account",
  createAccountAction: "Create my account",
  createAccountDescription: "It takes an email and a password.",
  currentPasswordPlaceholder: "Your password",
  currentPasswordRequired: "Enter your password.",
  email: "Email",
  emailInvalid: "Enter an email like name@example.com.",
  emailPlaceholder: "name@example.com",
  emailRequired: "Enter your email.",
  forgotPassword: "Forgot password?",
  forgotPasswordDescription:
    "Enter your account’s email and we’ll send you a link to choose a new password.",
  forgotPasswordTitle: "Reset your password",
  haveAccount: "Already have an account?",
  hidePassword: "Hide password",
  homeHeading: "Effect Bun Starter Web",
  homeLead: "Typed client connected through Effect Atom.",
  language: "Language",
  loaderStatus: "Loader API {status}",
  navigation: "Main navigation",
  newPassword: "New password",
  newPasswordDescription: "You’ll be signed out on your other devices.",
  newPasswordPlaceholder: "Choose a password",
  newPasswordTitle: "Choose a new password",
  noAccount: "No account yet?",
  notFoundBody: "That page does not exist.",
  notFoundTitle: "Not found",
  password: "Password",
  passwordDescription: "At least 8\u00a0characters",
  passwordRequired: "Enter at least 8\u00a0characters.",
  passwordResetDoneDescription: "Sign in with your new password.",
  passwordResetDoneTitle: "Password changed",
  ping: "Ping API",
  pingFailed: "Ping failed",
  pinging: "Pinging…",
  requestNewLink: "Send a new link",
  resetLinkInvalidDescription:
    "Reset links work once and expire after an hour. Ask for a new one.",
  resetLinkInvalidTitle: "This link no longer works",
  resetLinkSentDescription:
    "If an account uses this address, a link to reset its password is on its way. It works once and expires in one hour.",
  resetLinkSentTitle: "Check your email",
  resetPasswordFailed: "The password could not be changed. Try again.",
  resetRequestFailed: "The email could not be sent. Try again.",
  saveNewPassword: "Save new password",
  sendResetLink: "Send reset link",
  showPassword: "Show password",
  signIn: "Sign in",
  signInAction: "Sign in",
  signInDescription: "Good to see you again.",
  signOut: "Sign out",
  siteDescription:
    "An Effect, Bun and TanStack Start app with a typed API client.",
  themeMatchSystem: "Match the system theme",
  themeUseDark: "Use the dark theme",
  themeUseLight: "Use the light theme",
};

type Messages = { readonly [Key in keyof typeof english]: string };
export type Copy = Messages;

export const messages = {
  en: english,
  fr: {
    account: "Compte",
    accountName: "Nom",
    accountNamePlaceholder: "Votre nom complet",
    accountNameRequired: "Saisissez votre nom.",
    apiChecking: "Vérification de l’API",
    apiStatus: "API\u00a0: {status}",
    apiUnavailable: "API indisponible",
    appName: "Effect Bun Starter",
    authAccountExists:
      "Un compte utilise déjà cette adresse. Connectez-vous plutôt.",
    authenticationFailed: "Cela n’a pas fonctionné. Réessayez.",
    authInvalidCredentials: "L’e-mail ou le mot de passe est incorrect.",
    authPasswordTooLong: "128 caractères au maximum.",
    authTooManyAttempts:
      "Trop de tentatives. Patientez une minute, puis réessayez.",
    backHome: "Retour à l’accueil",
    backToSignIn: "Retour à la connexion",
    createAccount: "Créer un compte",
    createAccountAction: "Créer mon compte",
    createAccountDescription: "Il suffit d’un e-mail et d’un mot de passe.",
    currentPasswordPlaceholder: "Votre mot de passe",
    currentPasswordRequired: "Saisissez votre mot de passe.",
    email: "E-mail",
    emailInvalid: "Saisissez un e-mail comme nom@exemple.com.",
    emailPlaceholder: "nom@exemple.com",
    emailRequired: "Saisissez votre e-mail.",
    forgotPassword: "Mot de passe oublié\u00a0?",
    forgotPasswordDescription:
      "Saisissez l’e-mail de votre compte\u00a0: nous vous enverrons un lien pour choisir un nouveau mot de passe.",
    forgotPasswordTitle: "Réinitialiser le mot de passe",
    haveAccount: "Vous avez déjà un compte\u00a0?",
    hidePassword: "Masquer le mot de passe",
    homeHeading: "Effect Bun Starter Web",
    homeLead: "Client typé connecté par Effect Atom.",
    language: "Langue",
    loaderStatus: "API du loader\u00a0: {status}",
    navigation: "Navigation principale",
    newPassword: "Nouveau mot de passe",
    newPasswordDescription: "Vous serez déconnecté de vos autres appareils.",
    newPasswordPlaceholder: "Choisissez un mot de passe",
    newPasswordTitle: "Choisissez un nouveau mot de passe",
    noAccount: "Pas encore de compte\u00a0?",
    notFoundBody: "Cette page n’existe pas.",
    notFoundTitle: "Page introuvable",
    password: "Mot de passe",
    passwordDescription: "8\u00a0caractères minimum",
    passwordRequired: "Saisissez au moins 8\u00a0caractères.",
    passwordResetDoneDescription:
      "Connectez-vous avec votre nouveau mot de passe.",
    passwordResetDoneTitle: "Mot de passe modifié",
    ping: "Tester l’API",
    pingFailed: "Échec du test",
    pinging: "Test en cours…",
    requestNewLink: "Envoyer un nouveau lien",
    resetLinkInvalidDescription:
      "Un lien de réinitialisation ne sert qu’une fois et expire au bout d’une heure. Demandez-en un nouveau.",
    resetLinkInvalidTitle: "Ce lien ne fonctionne plus",
    resetLinkSentDescription:
      "Si un compte utilise cette adresse, un lien de réinitialisation est en route. Il ne sert qu’une fois et expire au bout d’une heure.",
    resetLinkSentTitle: "Consultez vos e-mails",
    resetPasswordFailed: "Le mot de passe n’a pas pu être modifié. Réessayez.",
    resetRequestFailed: "L’e-mail n’a pas pu être envoyé. Réessayez.",
    saveNewPassword: "Enregistrer le mot de passe",
    sendResetLink: "Envoyer le lien",
    showPassword: "Afficher le mot de passe",
    signIn: "Connexion",
    signInAction: "Se connecter",
    signInDescription: "Ravi de vous revoir.",
    signOut: "Se déconnecter",
    siteDescription:
      "Une application Effect, Bun et TanStack Start avec un client d’API typé.",
    themeMatchSystem: "Suivre le thème du système",
    themeUseDark: "Passer au thème sombre",
    themeUseLight: "Passer au thème clair",
  },
} satisfies Record<Locale, Messages>;

/** Replaces `{name}` placeholders: `fill("Hi {name}", { name: "Ada" })`. */
export const fill = (
  template: string,
  values: Readonly<Partial<Record<string, string>>>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/** `<title>` for a route: "Sign in · Effect Bun Starter". */
export const documentTitle = (locale: Locale, pick: (copy: Copy) => string) => {
  const copy = messages[locale];
  return { meta: [{ title: `${pick(copy)} · ${copy.appName}` }] };
};
