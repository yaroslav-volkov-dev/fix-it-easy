# Editing the FIX IT EASY website

You can change the words on this website yourself, from a web browser. You do not need to
install anything and you cannot break the live site by making a mistake — if something is
wrong, the update simply does not go out and the site keeps working as it did.

---

## Where the words live

Every piece of text on the site is in a file. The files are grouped by what they control:

| Folder | What it controls |
|---|---|
| `src/content/site/` | The phone number, the menu, the footer, the legal pages |
| `src/content/home/` | The home page, one file per block |
| `src/content/services/` | One file per appliance page (eight of them) |
| `src/content/cities/` | One file per city we serve |

The phone number is in **one** place — `src/content/site/brand.yaml`. Change it there and it
changes on every button, in the header, in the footer and in the bar at the bottom of a
phone screen.

### The appliance grid on the home page

The grid of appliance cards is in `src/content/home/appliances.yaml`. It has eleven cards but
only eight pages behind them, because oven, stove, range and cook top all lead to the same
combined page. Each card has three lines:

```yaml
  - label: cook top          # the word the visitor reads on the card
    icon: cooktop            # which picture to draw
    service: oven-stove-range-repair   # which page the card opens
```

`service` has to match the name of a file in `src/content/services/`, without the `.yaml`.
If it does not, the update is rejected rather than quietly creating a card that leads nowhere.

This grid is the only way into the appliance pages from the body of the site, so every
service file needs a card pointing at it — the build checks that too.

---

## How to change something

1. Go to the repository on **github.com** and open the file you want to change.
2. Click the **pencil** icon at the top right of the file.
3. Edit the text.
4. Scroll down, write one line saying what you changed, and click **Commit changes**.

About a minute later the live site updates by itself.

---

## What these files look like

A file is a list of labels and values, one per line:

```yaml
name: Tampa
state: FL
metaTitle: Appliance Repair in Tampa, FL | FIX IT EASY
```

Three rules keep them working:

- **Never change the words on the left of the colon.** `name:` and `state:` are labels the
  website looks for. Change what comes after the colon, not the label itself.
- **Keep the spaces at the start of a line exactly as they are.** The indentation is how the
  file shows which item belongs to which. Adding or removing spaces at the start of a line
  is the single most common way to break a file.
- **A line that starts with `#` is a note to you.** It does not appear on the website.

Longer paragraphs are written like this, with `>-` and the text indented underneath:

```yaml
heroIntro: >-
  Tampa sits in the stretch of the country that gets struck by lightning
  more than anywhere else, and appliance control boards are what pay for it.
```

Keep the `>-` and keep every line of the paragraph indented by the same amount. Where the
lines happen to break does not matter — the website joins them back into one paragraph.

Some sentences contain something in curly brackets, like `{city}` or `{phone}`. Those are
filled in automatically. Leave them exactly as they are.

---

## Adding a new city

1. Open `src/content/cities/`, open the city closest to the new one, and copy everything in it.
2. Use **Add file → Create new file**, name it after the city in lower case with dashes —
   `west-palm-beach.yaml` — and paste.
3. Change every field to suit the new city.
4. Commit.

The page appears at `/locations/west-palm-beach/` and is added to the menus and the site map
automatically. You do not have to link it anywhere.

### The one rule that matters

**A new city page has to be genuinely written for that city.** Copying another city and
swapping the name is the fastest way to make both pages invisible on Google — search engines
treat near-identical pages as one page and quietly ignore the copies.

The website enforces this. When you commit, it compares the new city's two main sections —
`heroIntro` and `localConditions` — against every other city, **after removing all the place
names**, so renaming Tampa to Miami does not fool it. If two cities are more than 60% alike,
the update is rejected with a message naming both files.

It also refuses a city that has:

- a `heroIntro` shorter than 300 characters
- fewer than 6 neighborhoods
- fewer than 4 questions in the FAQ
- fewer than 2 FAQ answers that actually mention that city or one of its neighborhoods

Write about what is genuinely different where you are: the weather, the age of the houses,
the water, the buildings, how people live. That is what the page is for.

New cities start with `reviewStatus: draft`. Once you have read the text through and are
happy that everything in it is true, change that line to `reviewStatus: approved`. Anything
still marked `draft` will not go out to the live site.

---

## Changing an appliance page

The same rule applies to the files in `src/content/services/`. Each one needs:

- an `intro` of at least 300 characters
- 5 to 7 entries under `commonProblems`
- at least 3 entries under `whenToCall` — the safety warnings: gas, refrigerant, 240-volt
  circuits, sealed systems
- a `repairOrReplace` paragraph of at least 200 characters
- 4 to 6 questions in the `faq`

And, as with cities, two appliance pages may not say the same thing. The build compares the
`intro` and the `commonProblems` of every pair of appliances **after removing the appliance
names**, so changing "washer" to "dryer" in a copied paragraph will not get past it.

If you add a brand new appliance file, remember to add a card for it in
`src/content/home/appliances.yaml` — otherwise nothing on the site links to the new page and
the build will tell you so.

---

## If something goes wrong

Github will show a red **✗** next to your change and an email will arrive. Open the ✗ and
scroll to the bottom — the message says which file has the problem and what to fix, in plain
English.

**The live site is untouched while this is happening.** A rejected change never reaches
visitors. Fix the file and commit again, or ask the developer.

---

## What to send to the developer instead of editing yourself

- A new photo, logo file, or anything else that is not text
- A new page that is not an appliance or a city
- Changes to the layout, the colours or the order of blocks on a page
- The privacy policy and terms of service text once your attorney supplies it
- Anything you have tried twice and that keeps being rejected
