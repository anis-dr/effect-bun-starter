---
name: scannable-ui
description: 'Design or critique compact UI (cards, lists, checklists, settings panels, dashboards) so it reads as "weirdly perfect": lock content to edges, differentiate dense content, swap text for visuals, create emphasis through contrast with neighbors, dissolve cards into the layout. Source: Kole Jain, "The secret behind weirdly perfect UI designs", with example frames.'
---

# Scannable UI: edges, differentiation, visuals, emphasis

Source: Kole Jain, [The secret behind weirdly perfect UI designs](https://www.youtube.com/watch?v=neE6wOuBIP8) (8:16). Every image in `images/` is a frame from the video at the moment the concept is shown. Open the image with `read` when you need the visual. The video's Figma assets are linked in its description.

## Core thesis

**Nobody reads a screen.** A person arrives with a question already in mind and hunts until they find the answer. In VS Code you look for one file, and in a settings panel you look for one setting. Nothing on a screen is ever fully consumed.

The four tools below don't make a screen prettier. They make it faster to scan:

1. **Edges**: every element is locked to an edge.
2. **Differentiation**: dense content is broken up with different kinds of content, not with white space.
3. **Show, don't tell**: text is replaced with visuals people recognize instantly.
4. **Emphasis by contrast**: this tells the eye where to start.

Each one is covered below.

| Image | What it shows |
| --- | --- |
| `images/27-vscode-hunting-one-file.jpg` | Opening VS Code to find one file |
| `images/26-properties-panel-one-setting.jpg` | Opening a properties panel to change one field |

---

## 1. Edges hold everything together

A Walmart receipt looks perfectly built and has no dividers and almost no white space. Its text is aligned hard left and its prices hard right. Those **two edges hold everything together**. The only centered things are the codes, the parts you're not meant to read. Alignment lets you skip what doesn't matter.

- `images/01-receipt-edges.jpg`: the receipt with its left column (pink) and right column (cyan) highlighted.
- `images/02-checklist-hard-edges.jpg`: the same idea in a checklist. Date badges sit on the left edge, text starts on one line, and tags and actions are right-aligned.

### Profile card walkthrough

| Step | Image | Lesson |
| --- | --- | --- |
| Start | `03-profile-sparse.jpg` | An empty card. The instinct is to fill the space with more content, and that looks strange. |
| Overfilled | `04-profile-crowded-buttons.jpg` | The buttons ignore the edges and there are too many of them: Send offer, Message, X, Dribbble, link, Profile. |
| Anti-pattern | `05-profile-hidden-menu-antipattern.jpg` | Stretching the primary buttons and hiding the secondary ones in a ⋯ menu looks better, but **hiding elements is generally not the fix**. |
| Move content to edges | `06-profile-content-moved-to-edges.jpg` | The social icons and Profile button move to the top-right edge, beside the avatar. The stats go in a four-column row. The top area is still unresolved. |
| Manufacture an edge | `07-profile-manufactured-edge.jpg` | Add a cover banner. It moves the top edge down, so the avatar and buttons line up on one solid line and the content below stacks on it. |
| Result | `08-profile-edges-highlighted.jpg` | Every element now touches at least two edges. |

A card has four edges. Content also creates **internal edges**, such as the bottom edge of the avatar-and-name block, and more content can stack onto those. In almost every compact UI (chat inputs, Kanban cards, sidebars), each element sits on two or more edges. See `images/09-kanban-card-edges.jpg`.

### Checklist edges

- `images/10-checklist-lines-stack.jpg`: every line creates a new edge for the next line to stack onto, which is why a plain checklist looks perfectly built.
- `images/11-checklist-icons-missing-edge.jpg`: replacing the checkboxes with larger date icons removes the bottom edge, because each icon is taller than its row of text.
- `images/12-checklist-subline-restores-edge.jpg`: a subline (action and tag) under each title gives back the bottom edge.

**Rule:** when an element changes height, check that each row still has a bottom edge to stack on. If it doesn't, add a secondary line or re-align.

### Edges are necessary but not sufficient

`images/13-full-width-lines.jpg` keeps every edge in exactly the same place but lets the lines run the full width, and it stops feeling perfect. `images/14-wall-of-text-vs-bullets.jpg` shows identical content as a wall of text on the left and a structured version with bullets on the right. The content is the same and the presentation is not. Long lines and long undifferentiated runs of text still feel like a chore.

---

## 2. Differentiate the content, don't pad it

Adding white space to fight density helps a little but makes everything longer. **The problem isn't too much content. It's too much undifferentiated content.**

| Step | Image | Change |
| --- | --- | --- |
| Undifferentiated | `15-undifferentiated-list.jpg` | Six long lines of text that all look the same |
| Avatars | `16-differentiate-avatars.jpg` | An inline avatar wherever a person is referenced. The list is easier to parse. |
| Times | `17-differentiate-times.jpg` | Right-aligned due times with a clock icon (9:30am, in 5 days) |
| Grouping | `18-differentiate-grouping.jpg` | Grouped under **Tomorrow** and **Next week**. Any task can be found in about a second, whatever the amount of text. The density now works for you. |

Chat assistants do the same thing for the same reason. Older AI chats used too many bullet points (`images/19-ai-chat-bullets.jpg`), and Claude Code ends its replies with tables (`images/20-ai-chat-table.jpg`). Both break up the wall of text.

Grouping and varying the content makes a screen easier to navigate, but the user is still reading, only in smaller chunks. The next step removes reading altogether.

---

## 3. Show, don't tell: visuals register instantly

You knew who each task referenced the moment the avatars went in, before reading a name. A red octagon (`images/21-stop-sign.jpg`) reads as a stop sign with nothing written on it, because the shape is universal.

- `images/22-expense-text-overexplained.jpg` shows the expense card as text: amounts plus "vs $6,231" comparisons and percentage deltas. It has **more raw information**.
- `images/33-expense-chart-visual.jpg` turns most of that text into paired bars (this week against average). It registers the moment you look at it.

**The trap:** when something isn't clear, the instinct is to explain it harder by adding a comparison, a label or a tooltip. That feels productive because every addition is technically more information. But it **makes the screen harder to read in order to make it easier to understand**, and you almost never want that trade.

**The counter-case:** in a bulk action bar (`images/23-action-bar-icons-need-tooltips.jpg`), you know what the checkbox does because it sits above the rows. The other icons leave you guessing until the tooltip appears. Visuals only work when they are **immediately recognizable**. Obscure icons are worse than text.

Applied to the checklist (`images/24-checklist-links-and-chips.jpg`, `images/25-chips-closeup.jpg` shows the tag-swap dropdown opened from a chip):

- Links are blue and underlined (for example "Q2 invoice folder" and "tax filings").
- Colored chips with icons categorize tasks: FINANCE, VC, PAYROLL, EVENTS.
- **The chips also add function.** Users can swap a tag directly on the chip, which would otherwise be hidden behind a menu.

---

## 4. Emphasis is contrast with neighbors, not a property

Edges, differentiation and visuals make a screen faster to scan, but none of them tells the eye **where to start**.

Look at a checkbox (`images/28-checkbox-off.jpg` and `images/29-checkbox-on.jpg`). When it's off, it's a thin border with no color and no icon, and it's easy to skip. When it's checked, it gets a fill and a check mark. Nobody would design a checkbox that is blue when it's off, because **the color is the whole signal that something changed**.

### Settings panel

- `images/30-settings-all-defaults-emphasized.jpg`: the edges are clean, tabs do the grouping and every value is a chip with an icon. It follows every rule so far, yet it isn't clear which values matter. **Every chip shows its default value** but is styled as emphasized, like six checkboxes that are blue when they're off.
- `images/32-settings-defaults-gray.jpg`: don't give the important chip more color or bolder text. **Change its surroundings.** The default values go gray, and the one non-default value ("Suggest only") keeps its tint and stands out.

In `images/31-menu-single-accent.jpg`, the Claude app menu is monochrome except for one blue item, "Resubscribe to Pro", the item the product wants you to click.

> Emphasis isn't something an element _has_. It's the difference between it and its neighbors.

**Rule:** the default, off, or unchanged state looks neutral (gray, outline, no fill). Only a changed state, a non-default value or the primary action gets color.

---

## 5. Cards are training wheels: dissolve them into the layout

Every example above is a card, on purpose. A card gives you four edges for free, and when content doesn't fit you resize the card. Nobody ships only a card, though. On a wide canvas, people add containers and cards for structure until there are **borders on borders and three corner radii stacked together**. None of that helps.

| Image | State |
| --- | --- |
| `34-dashboard-cards.jpg` | A CRM page built from cards: chart, tasks, activity, profile, expense report and details |
| `35-borders-on-borders.jpg` | Close-up of nested borders and radii (marked in red) |
| `36-dissolved-sidebar-and-main.jpg` | Dissolved, zoomed: the main column's Tasks and Activity are sections with no card borders; the sidebar edge is the only line |
| `37-dissolved-right-column-top.jpg` | Dissolved, zoomed: profile and expense report are sections in the right column, split by a single divider |
| `38-dissolved-right-column-sections.jpg` | Dissolved, zoomed: Rep Details, Activity and Reporting separated only by headers; one vertical column edge |

The video never shows the fully dissolved page in one clean shot, only these zoomed views.

The dissolved layout keeps the principles:

- The **column edge** does the job the card edge did.
- Each row stacks onto the one above.
- **Sections** group the content, so there is no single long undifferentiated list.
- **Chips and icons** still do the reading for the user.
- **Default values are gray**, so the non-default ones catch the eye.

Cards or no cards, all of it serves a scannable interface.

---

## Checklist for designing or critiquing a screen

Work through these in order when building UI or reviewing a design or implementation.

1. **What question does the user arrive with?** Design so they can find that one answer, not so they read everything.
2. **Edges**
   - Does every element sit on at least two edges (container edges or internal ones)?
   - Are the columns hard-left and hard-right, like a receipt? Is anything centered that should be read?
   - Did a taller element (icon, avatar) remove a row's bottom edge? Add a subline or re-align.
   - Is there an unresolved empty region? Manufacture an edge (banner, header band) instead of filling it with more content.
   - Are secondary actions hidden in a ⋯ menu only to tidy up? Move them onto an edge instead.
   - Are text lines running full width? Constrain the measure.
3. **Differentiation**
   - Is there a run of similar-looking rows? Add avatars for people, right-aligned time or status, and group headers (by date, status or owner) before adding white space.
   - Is long prose better as bullets or a table?
4. **Show, don't tell**
   - Can a number be a bar, a trend a sparkline, a category a colored chip with an icon, a person an avatar, a link blue and underlined?
   - Did someone "fix" a confusing element by adding labels, comparisons or tooltips? Replace the explanation with a visual.
   - Is every icon instantly recognizable without its tooltip? If not, use a label or a clearer glyph.
   - Can a visual element also act as a control (for example, a chip that swaps its tag)?
5. **Emphasis**
   - Do default and off states look neutral (gray, outline)?
   - Does color appear only where something changed, differs from the default, or is the one primary action?
   - Is there exactly one obvious place to start per region?
   - To make something stand out, dim its neighbors before making it louder.
6. **Containers**
   - Are there borders on borders or stacked radii? Replace nested cards with column dividers, section headers and alignment.
   - Keep cards for self-contained widgets. Full layouts should rely on edges.

## Anti-patterns (quick reference)

- Filling empty space with more content
- Hiding actions in overflow menus to tidy up
- Using white space alone as the cure for density
- Adding labels, comparisons or tooltips to explain instead of visualizing
- Obscure icons that only work with a tooltip
- Accent color on default or unchanged values (a checkbox that is blue when off)
- Emphasizing by adding more color or weight to the target instead of reducing its neighbors
- Nested cards: borders on borders, stacked radii
- Full-width text lines
