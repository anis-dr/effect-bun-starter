/** An email ready for `Mailer.send`: every template renders to this. */
export interface RenderedEmail {
  readonly html: string;
  readonly subject: string;
  readonly text: string;
}
