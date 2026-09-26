import { Array as Arr, Boolean, Option, Order } from "effect";

/** The app's languages. Adding one touches the web app and the emails;
 * the steps are in the README ("To add a language"). */
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
  accessDenied: "Access denied",
  accessDeniedDescription:
    "This page is for admins. Ask the app’s owner to appoint you.",
  admin: "Admin",
  adminLead: "Create stores and choose who else can.",
  admins: "Admins",
  adminsEmpty: "No admins yet.",
  adminsLead: "Admins can create stores. Only you can appoint or remove them.",
  adminsUnavailable: "The admins couldn’t be loaded. Try again in a moment.",
  appointAction: "Appoint admin",
  appointed: "{name} is now an admin.",
  appointEmail: "Account email",
  appointEmailHint: "The person needs an account with a confirmed email.",
  appointFailed: "The admin couldn’t be appointed. Try again.",
  appointNotFound: "No account uses this email.",
  appointNotVerified:
    "This account hasn’t confirmed its email yet. Ask them to open the link they were sent.",
  cancel: "Cancel",
  createStore: "Create a store",
  createStoreAction: "Create store",
  removeAdmin: "Remove",
  removeAdminAction: "Remove admin",
  removeAdminDescription:
    "Their account stays, but they can no longer create stores.",
  removeAdminLabel: "Remove {name}",
  removeAdminTitle: "Remove {name} as admin?",
  removed: "{name} is no longer an admin.",
  removeFailed: "The admin couldn’t be removed. Try again.",
  storeCreated: "“{name}” was created.",
  storeCreateFailed: "The store couldn’t be created. Try again.",
  storeName: "Name",
  storeNameRequired: "Enter a name.",
  storeNameTaken: "A store already has this name.",
  storeNameTooLong: "Use at most 80\u00a0characters.",
  avatarFailed: "The photo couldn’t be saved. Try again.",
  avatarHeading: "Profile photo",
  avatarHint: "JPEG, PNG or WebP, up to 5\u00a0MB.",
  avatarRemove: "Remove photo",
  avatarRemoved: "Photo removed.",
  avatarRemoveFailed: "The photo couldn’t be removed. Try again.",
  avatarSaved: "Photo saved.",
  avatarUpload: "Upload a photo",
  imageTooLarge: "Choose an image of 5\u00a0MB or less.",
  imageUnsupported: "Choose a JPEG, PNG or WebP image.",
  signOutDescription:
    "Sign out of this browser. Your other devices stay signed in.",
  emailUnverified: "Your email isn’t confirmed yet",
  emailUnverifiedDescription:
    "Open the link we sent to {email}. Admin roles need a confirmed email.",
  verificationSendFailed: "The link couldn’t be sent. Try again.",
  verificationSent: "A new link is on its way to {email}.",
  allStores: "All stores",
  clearSearch: "Show all stores",
  homeHeading: "Stores",
  homeLead:
    "The example resource: listed and searched on the server, created in the admin area.",
  searchAction: "Search",
  searchLabel: "Search stores",
  searchPlaceholder: "Store name",
  storesEmptyDescription: "An admin can create the first one.",
  storesEmptyTitle: "No stores yet",
  storesMatching: "Results for “{q}”",
  storesNoMatchDescription: "Check the spelling or try fewer words.",
  storesNoMatchTitle: "Nothing matches “{q}”",
  storesUnavailable: "The stores couldn’t be loaded. Try again in a moment.",
  emailVerified: "Your email is confirmed.",
  emailVerifyFailed: "This confirmation link no longer works",
  emailVerifyFailedDescription:
    "Links expire after an hour. Send a new one from your account page.",
  account: "Account",
  accountName: "Name",
  accountNamePlaceholder: "Your full name",
  accountNameRequired: "Enter your name.",
  appName: "Effect Bun Starter",
  authAccountExists: "An account already uses this email. Sign in instead.",
  authenticationFailed: "That didn’t work. Try again.",
  authInvalidCredentials: "The email or password is incorrect.",
  authPasswordTooLong: "Use at most 128 characters.",
  authTooManyAttempts: "Too many attempts. Wait a minute, then try again.",
  backHome: "Back to home",
  backToSignIn: "Back to sign in",
  continue: "Continue",
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
  language: "Language",
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
  signUpSentDescription:
    "Your account is ready. To confirm your address, open the link we sent to:",
  signUpSentTitle: "Check your inbox",
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
    accessDenied: "Accès refusé",
    accessDeniedDescription:
      "Cette page est réservée aux administrateurs. Demandez au propriétaire de l’application de vous nommer.",
    admin: "Administration",
    adminLead: "Créez des boutiques et choisissez qui d’autre peut le faire.",
    admins: "Administrateurs",
    adminsEmpty: "Aucun administrateur pour l’instant.",
    adminsLead:
      "Les administrateurs peuvent créer des boutiques. Vous seul pouvez les nommer ou leur retirer ce rôle.",
    adminsUnavailable:
      "Les administrateurs n’ont pas pu être chargés. Réessayez dans un instant.",
    appointAction: "Nommer administrateur",
    appointed: "{name} a désormais le rôle d’administrateur.",
    appointEmail: "E-mail du compte",
    appointEmailHint:
      "La personne doit d’abord avoir un compte à l’e-mail confirmé.",
    appointFailed: "Le rôle n’a pas pu être attribué. Réessayez.",
    appointNotFound: "Aucun compte n’utilise cet e-mail.",
    appointNotVerified:
      "Ce compte n’a pas encore confirmé son e-mail. Demandez à la personne d’ouvrir le lien reçu.",
    cancel: "Annuler",
    createStore: "Créer une boutique",
    createStoreAction: "Créer la boutique",
    removeAdmin: "Retirer",
    removeAdminAction: "Retirer le rôle",
    removeAdminDescription:
      "Le compte est conservé, mais il ne peut plus créer de boutiques.",
    removeAdminLabel: "Retirer {name}",
    removeAdminTitle: "Retirer le rôle d’administrateur à {name}\u00a0?",
    removed: "{name} n’a plus le rôle d’administrateur.",
    removeFailed: "Le rôle n’a pas pu être retiré. Réessayez.",
    storeCreated: "«\u00a0{name}\u00a0» a été créée.",
    storeCreateFailed: "La boutique n’a pas pu être créée. Réessayez.",
    storeName: "Nom",
    storeNameRequired: "Saisissez un nom.",
    storeNameTaken: "Une boutique porte déjà ce nom.",
    storeNameTooLong: "80\u00a0caractères au maximum.",
    avatarFailed: "La photo n’a pas pu être enregistrée. Réessayez.",
    avatarHeading: "Photo de profil",
    avatarHint: "JPEG, PNG ou WebP, 5\u00a0Mo maximum.",
    avatarRemove: "Retirer la photo",
    avatarRemoved: "Photo retirée.",
    avatarRemoveFailed: "La photo n’a pas pu être retirée. Réessayez.",
    avatarSaved: "Photo enregistrée.",
    avatarUpload: "Importer une photo",
    imageTooLarge: "Choisissez une image de 5\u00a0Mo maximum.",
    imageUnsupported: "Choisissez une image JPEG, PNG ou WebP.",
    signOutDescription:
      "Déconnectez-vous de ce navigateur. Vos autres appareils restent connectés.",
    emailUnverified: "Votre adresse e-mail n’est pas encore confirmée",
    emailUnverifiedDescription:
      "Ouvrez le lien envoyé à {email}. Les rôles d’administration exigent une adresse confirmée.",
    verificationSendFailed: "Le lien n’a pas pu être envoyé. Réessayez.",
    verificationSent: "Un nouveau lien est en route vers {email}.",
    allStores: "Toutes les boutiques",
    clearSearch: "Voir toutes les boutiques",
    homeHeading: "Boutiques",
    homeLead:
      "La ressource d’exemple\u00a0: listée et recherchée sur le serveur, créée dans l’espace d’administration.",
    searchAction: "Rechercher",
    searchLabel: "Rechercher une boutique",
    searchPlaceholder: "Nom de la boutique",
    storesEmptyDescription: "Un administrateur peut créer la première.",
    storesEmptyTitle: "Aucune boutique pour l’instant",
    storesMatching: "Résultats pour «\u00a0{q}\u00a0»",
    storesNoMatchDescription:
      "Vérifiez l’orthographe ou essayez avec moins de mots.",
    storesNoMatchTitle: "Aucun résultat pour «\u00a0{q}\u00a0»",
    storesUnavailable:
      "Les boutiques n’ont pas pu être chargées. Réessayez dans un instant.",
    emailVerified: "Votre adresse e-mail est confirmée.",
    emailVerifyFailed: "Ce lien de confirmation ne fonctionne plus",
    emailVerifyFailedDescription:
      "Les liens expirent au bout d’une heure. Demandez-en un nouveau depuis votre compte.",
    account: "Compte",
    accountName: "Nom",
    accountNamePlaceholder: "Votre nom complet",
    accountNameRequired: "Saisissez votre nom.",
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
    continue: "Continuer",
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
    language: "Langue",
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
    signUpSentDescription:
      "Votre compte est prêt. Pour confirmer votre adresse, ouvrez le lien envoyé à\u00a0:",
    signUpSentTitle: "Consultez votre boîte de réception",
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
