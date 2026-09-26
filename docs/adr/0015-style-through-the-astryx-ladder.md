# Style Through the Astryx Ladder; Size in rem and Tokens

Screens take their look from the Astryx theme (`@astryxdesign/theme-neutral` until a project builds its own with `bunx astryx theme`). When a screen needs something the defaults don't give, take the first step that fits:

1. **A value** (colour, spacing, radius, type): a token (`var(--spacing-4)`, `--color-*`, `--radius-*`, `--font-size-*`). A project that needs other values changes them in its theme's `tokens`, never in `:root`.
2. **A look a component already offers**: its prop (`variant`, `size`, `color`, `gap`, `padding`, `maxWidth`).
3. **A named look used in chosen places**: a custom variant in the theme's `components` (`'variant:menu'`), used as a prop (`<Button variant="menu">`). This needs a project theme; `bunx astryx theme build` emits its CSS and type augmentation.
4. **A one-off look, or a component with no prop for it**: `xstyle` with `stylex.create` beside the component, using the typed token vars (`spacingVars["--spacing-4"]` from `@astryxdesign/core/theme/tokens.stylex`). `@stylexjs/unplugin` in `apps/web/vite.config.ts` compiles it with the class prefix `p` and emits it in `app.*` CSS layers after Astryx's, so it wins over the theme.

We don't use inline `style`, `className` with our own stylesheet, a nested `<Theme>` to restyle one component, or global tokens set to other values in one place to force a look. App-wide rules Astryx has no prop for (touch hit areas in `apps/web/src/theme/touch.css`) are the one stylesheet exception.

Sizes come from tokens or relative units, not pixels: `--spacing-*`, `--size-element-*`, `--radius-*` and `--border-width` for sizes, the `--font-size-*` rem scale for type, `rem` for widths a prop takes as a string (`maxWidth="40rem"`), unitless line heights, and `rem` in media queries. The interface then follows the user's font size. Where an Astryx prop only takes pixels (Grid's `columns.minWidth`), step 4 carries the rem value instead.

This follows Astryx's own guidance ("Component Style Overrides" and "Custom Variants" in the theme docs, `xstyle` in the styling docs) and keeps each value in one place. Steps 1-3 ship in prebuilt theme CSS, so they apply before hydration; step 4 is compiled at build time into static CSS, so it does too. No lint rule enforces the ladder; reviews do.
