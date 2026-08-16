# Product

## Register

brand

## Users

US homeowners in Florida and Connecticut whose appliance has just stopped working. They are
not browsing: something is leaking, warm, silent or smoking, and they are standing in the
kitchen with a phone in one hand. Most arrive on a small screen from a search like
"refrigerator repair tampa", and most will look at two or three companies before one of them
gets the call.

The job they are trying to get done, in order: find out whether the thing is worth repairing,
find out how soon somebody can be here, find out what it will cost before agreeing to
anything. Then call. They are not looking for a company to admire; they are looking for a
reason to stop looking.

## Product Purpose

Rank for `appliance repair {city}` queries and turn the visitor into a phone call. The call is
the only conversion action on the site. There are no forms, no email capture, no chat widget,
no newsletter: every call to action resolves to a `tel:` link.

Success is a phone ringing. Not time on page, not scroll depth, not a form fill.

## Brand Personality

**Urgency and speed.** The site should feel like a company that answers the phone and comes
today. Dense rather than airy, contrast rather than pastel, strong rhythm rather than an even
grey wash. Confidence expressed as directness.

Three words: fast, plain-spoken, dependable.

Voice: says the thing. "We answer within seconds" beats "Our commitment to responsiveness".
Numbers where we have them, silence where we do not.

## Anti-references

- **Corporate SaaS.** Soft gradients, identical rounded cards with an icon above a heading,
  blue-and-lilac palettes, decorative blur. The default result of "make it modern", and the
  single most likely way this site goes wrong.
- **Loud local trades site.** Yellow and red, exclamation marks, discount stickers, "CALL NOW!!!"
  banners. Urgency is a quality of the design, not a volume setting.
- **Sterile minimalism.** White and grey, nothing to catch on, a site about nothing. Tidy but
  faceless.
- **Fabricated trust signals** (from the client brief, and a legal constraint rather than a
  taste one): stock photographs of smiling technicians, star ratings, review counts,
  testimonials, "as seen on" badges, invented addresses or license numbers. None of these
  exist, so none of them appear.

## Design Principles

1. **The call is the only action.** Every screen has to answer one question: should I call
   these people now? Anything that does not help answer it is taking up room.
2. **Nothing is invented.** No address, license, rating, review, or photograph we do not have.
   Trust is earned by being specific about appliances and cities, not by wearing badges.
3. **Speed is both the promise and the medium.** A page that claims same-day service and takes
   three seconds to paint is arguing against itself. Zero client JavaScript, text-led hero.
4. **Local means specific.** A city page earns its place by naming what actually fails there:
   the salt air, the storm surges, the sixty-amp panels. Interchangeable copy with the city
   name swapped is worse than no city page at all, and the build refuses it.
5. **Restraint by execution, not by absence.** Improvements come from sharpening rhythm,
   contrast and alignment, not from adding visual devices. When something looks unfinished the
   answer is usually precision, not ornament.

## Accessibility & Inclusion

WCAG 2.1 AA, measured rather than assumed: contrast ratios are calculated and recorded in
`src/styles/global.css`, not eyeballed. Mobile first, because that is where the traffic is.

- Every interactive target at least 48px on its shortest side.
- Zero client JavaScript, so nothing depends on scripts loading or succeeding.
- `prefers-reduced-motion` honoured; no motion is load-bearing.
- The phone number is real text inside every call link, so the accessible name contains both
  the visible label and the number.
- No colour-only signalling; the red accent never carries meaning on its own.
