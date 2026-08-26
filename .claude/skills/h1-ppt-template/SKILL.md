---
name: h1-ppt-template
description: >
  Create and edit PowerPoint presentations using the uploaded H1 Tower
  presentation as the visual reference and template system. Preserve the
  original presentation's visual identity, layout logic, typography,
  spacing, tables, diagrams, image treatment, and overall design language.
  Use this skill whenever the user asks to create, modify, extend, or
  redesign a PowerPoint while requiring the result to look like the
  reference H1 presentation rather than like a generic AI-generated deck.
---

# H1 PPT Template Skill

## 1. PRIMARY OBJECTIVE

The primary objective is NOT to create a visually impressive generic AI presentation.

The primary objective is:

> Create a PowerPoint presentation that looks as if it was designed by the
> same human designer who created the reference H1 presentation.

The reference presentation is the source of truth for visual design.

When the user provides a different subject, company, project, product, or
business topic, preserve the visual language of the reference presentation
while replacing the content with the user's requested content.

Do not invent a new visual identity unless the user explicitly asks for one.

---

# 2. DESIGN PRIORITY

When making design decisions, follow this priority order:

1. Reference PPT template
2. Existing Slide Master / Slide Layout structures
3. Existing visual patterns in the reference presentation
4. Existing typography hierarchy
5. Existing spacing and alignment rules
6. Existing color palette
7. User's explicit instructions
8. General presentation design principles

Never allow generic AI presentation conventions to override the reference
template.

---

# 3. REFERENCE PRESENTATION

The primary reference presentation is:

`H1소개자료_ver1_260730_최종.pptx`

Treat this file as the visual design source of truth.

Before creating a new presentation from this template, inspect the reference
presentation whenever the actual file is available.

Do not rely solely on extracted text.

Inspect both:

- PowerPoint structure
- Rendered slide appearance

The visual appearance of the slides is authoritative.

---

# 4. TEMPLATE ANALYSIS

Before generating a new presentation, analyze the reference presentation.

Identify:

- Slide dimensions
- Slide Master
- Slide Layouts
- Background treatment
- Primary colors
- Secondary colors
- Accent colors
- Typography
- Title hierarchy
- Subtitle hierarchy
- Body text hierarchy
- English/Korean typography treatment
- Text alignment
- Margins
- Grid structure
- Column structure
- Image placement
- Image cropping
- Image masks
- Lines
- Borders
- Shapes
- Tables
- Charts
- Maps
- Diagrams
- Icons
- Page numbering
- Headers
- Footers
- Logo placement
- Repeated visual components
- Section divider patterns
- Data presentation patterns

Create an internal layout catalog.

The layout catalog should classify reusable slide types such as:

- Cover
- Section divider
- Project overview
- Location / location environment
- Key advantages
- Feature summary
- Industry recommendation
- Area schedule
- Detailed table
- Image + text
- Diagram + text
- Floor plan / architectural diagram
- Module / floor configuration
- Comparison
- Pricing
- Contact / closing
- Other recurring layouts found in the reference presentation

Do not assume that these are the only layouts.

Discover additional layouts from the reference file.

---

# 5. DO NOT DESIGN FROM SCRATCH

This is the most important rule.

When creating a slide:

1. Search the reference presentation for an existing layout with a similar
   visual purpose.
2. Reuse that layout.
3. Replace the content.
4. Preserve its geometry.
5. Preserve its visual hierarchy.
6. Preserve its spacing.
7. Preserve its typography.
8. Preserve its visual components.

Only create a new layout when no suitable reference layout exists.

Even when creating a new layout, it must visually belong to the same design
system.

Do NOT create an entirely new presentation design.

---

# 6. ANTI-AI-DESIGN RULES

Avoid visual patterns commonly associated with generic AI-generated
presentations.

Do NOT introduce these unless they already exist in the reference:

- Generic card grids
- Excessive rounded rectangles
- Random colored cards
- Excessive gradients
- Decorative gradients
- Large glowing effects
- Random drop shadows
- Excessive icons
- Random emoji
- Generic infographic icons
- Stock-style decorative illustrations
- Oversized typography
- Excessive bold text
- Excessive use of accent colors
- Excessive centered text
- Random asymmetrical layouts
- Unnecessary visual decoration
- Generic "consulting deck" styling
- Generic startup pitch deck styling
- Generic SaaS presentation styling
- Generic Canva-style layouts

If a visual element is not present in the reference design language,
do not add it merely because it looks attractive.

---

# 7. HUMAN-DESIGNED APPEARANCE

The output should feel restrained, deliberate, and professionally
art-directed.

Prefer:

- Consistent alignment
- Consistent spacing
- Strong hierarchy
- Repeated visual patterns
- Controlled typography
- Controlled color usage
- Purposeful imagery
- Clear information density
- Reusable layout structures

Do not optimize for visual novelty.

Optimize for consistency.

---

# 8. TYPOGRAPHY

Typography must be treated as a structural component of the design.

Preserve the reference presentation's:

- Font family
- Font weight
- Font size hierarchy
- Line spacing
- Character spacing where applicable
- Korean/English hierarchy
- Title/subtitle relationship
- Number styling
- Caption styling
- Table typography

Do not substitute fonts unnecessarily.

If the exact font is unavailable:

1. Identify the closest available font.
2. Preserve the approximate visual weight.
3. Preserve the relative size hierarchy.
4. Preserve line spacing.
5. Do not compensate for font differences by changing the overall layout.

Never use a random modern sans-serif font simply because it is available.

---

# 9. COLOR SYSTEM

Extract the reference presentation's actual color system.

Identify:

- Background color
- Primary text color
- Secondary text color
- Accent color
- Line color
- Table colors
- Highlight colors
- Image overlay colors

Reuse these colors consistently.

Do not invent new colors.

If the new content requires a color that does not exist in the reference,
first determine whether an existing accent color can perform the same
function.

Only introduce a new color when absolutely necessary and when the user
explicitly requests it.

---

# 10. SPACING AND ALIGNMENT

Preserve the reference presentation's visual rhythm.

Maintain:

- Left and right margins
- Top and bottom margins
- Title position
- Subtitle position
- Text block spacing
- Image spacing
- Table spacing
- Section spacing
- Repeated alignment guides

Elements should align to the same visual grid as the reference.

Avoid arbitrary pixel-level positioning unless required by the reference.

---

# 11. CONTENT FIT RULE

Never distort the design simply to fit excessive text.

If content does not fit:

1. Reduce unnecessary wording.
2. Condense sentences.
3. Remove repetition.
4. Reduce the number of content elements.
5. Select another existing layout.
6. Only then make a minimal layout adjustment.

Do NOT:

- Shrink text excessively
- Compress everything into tiny text
- Move elements randomly
- Add additional decorative containers
- Create a new layout without justification

The presentation should remain readable.

---

# 12. TABLES

Tables require special treatment.

If the reference presentation contains a table with a recognizable structure,
reuse that structure.

Preserve:

- Column hierarchy
- Row hierarchy
- Header treatment
- Border treatment
- Alignment
- Number formatting
- Unit formatting
- Font sizes
- Spacing
- Highlighting
- Total/subtotal treatment

Do not replace a professional reference table with a generic AI table.

For financial, area, pricing, operational, or numerical tables:

- Preserve numeric precision supplied by the user.
- Do not invent values.
- Do not silently recalculate values.
- Do not change units.
- Do not change rounding rules unless explicitly requested.

---

# 13. DATA INTEGRITY

Never invent factual information.

When creating a presentation:

- Use only information provided by the user or source files.
- Preserve source terminology.
- Preserve source numbers.
- Preserve units.
- Preserve dates.
- Preserve names.
- Preserve addresses.
- Preserve financial figures.

If information is missing:

- Leave a clearly identifiable placeholder, or
- Ask the user for the missing information.

Do not fabricate realistic-looking data.

---

# 14. IMAGES

Images should follow the reference presentation's image treatment.

Preserve:

- Aspect ratio
- Cropping style
- Placement
- Image size
- Image hierarchy
- Rounded corners if present
- Borders if present
- Overlays if present

Do not add decorative stock images merely to fill empty space.

If no appropriate image exists, prefer intentional whitespace over a
generic decorative image.

---

# 15. DIAGRAMS AND MAPS

When the reference presentation uses diagrams, maps, architectural
schematics, or location graphics:

- Preserve their visual hierarchy.
- Preserve label hierarchy.
- Preserve line weight.
- Preserve annotation style.
- Preserve the relationship between graphic and explanatory text.

Do not replace a structured diagram with a generic SmartArt graphic unless
the reference itself uses that style.

---

# 16. SLIDE STRUCTURE

Before generating slides, create a slide plan internally.

For every slide determine:

- Purpose
- Main message
- Content type
- Best reference layout
- Required visual elements
- Required data
- Expected information density

Prefer one clear message per slide.

Do not create slides merely to increase slide count.

---

# 17. LAYOUT SELECTION

For every slide, select the closest existing reference layout.

Use this conceptual mapping:

Content type
→ Reference layout
→ Adapt content
→ Preserve visual structure

Do not use:

Content type
→ Invent new layout
→ Add generic AI decoration

If several layouts are possible, choose the one with the closest:

1. Information density
2. Geometry
3. Visual hierarchy
4. Content type
5. Image/text ratio

---

# 18. SLIDE NUMBERING

Preserve the reference presentation's slide-numbering style.

Do not introduce a new numbering system.

If the reference uses section numbers, preserve the visual hierarchy of
those section numbers.

---

# 19. ENGLISH / KOREAN TREATMENT

When Korean and English are both used:

- Preserve the reference presentation's bilingual hierarchy.
- Maintain consistent capitalization style.
- Maintain consistent spacing.
- Maintain consistent placement.
- Do not translate terminology unless requested.
- Do not change established English terminology unnecessarily.

---

# 20. CONTENT WRITING STYLE

When rewriting presentation content:

Prefer concise professional language.

Use:

- Short headlines
- Short supporting statements
- Compact bullet structures
- Clear numerical emphasis
- Minimal redundancy

Do not fill slides with long paragraphs.

However, do not shorten factual information if doing so would remove
important meaning.

---

# 21. REFERENCE SLIDE PATTERN

The reference presentation contains several recurring presentation
patterns, including:

- Project overview
- Location/environment explanation
- Premium/value proposition
- Recommended industry by floor
- Area schedule
- Detailed floor/space information
- Flexible module explanation
- Rental/financial information
- Closing/contact information

These patterns should be treated as reusable design archetypes.

For new subjects, map the user's requested content to the closest existing
archetype.

Do not copy the original H1 business content unless the user asks for it.

---

# 22. RENDER-AND-INSPECT REQUIREMENT

A PPT is not considered finished merely because the `.pptx` file was
successfully generated.

After generating the PPT:

1. Render every slide to an image or PDF.
2. Inspect the rendered slides.
3. Check for:
   - Text overflow
   - Text clipping
   - Incorrect line wrapping
   - Misalignment
   - Incorrect font sizes
   - Excessive whitespace
   - Overcrowding
   - Broken tables
   - Image distortion
   - Incorrect cropping
   - Inconsistent margins
   - Inconsistent spacing
   - Missing page numbers
   - Missing logos
   - Color inconsistencies
4. Compare the output visually against the reference presentation.
5. Correct deviations.
6. Render again.
7. Repeat until acceptable.

Do not report a PPT as complete before visual inspection.

---

# 23. VISUAL QA STANDARD

Use the following standard:

### Level A — Excellent

The slide looks like it belongs to the same presentation as the reference.

### Level B — Acceptable

The slide uses the same design language but contains minor deviations.

### Level C — Not acceptable

The slide looks like a generic AI-generated PowerPoint.

If a slide reaches Level C:

- Do not simply polish it.
- Re-evaluate the selected layout.
- Select a closer reference layout.
- Rebuild the slide using the reference structure.

---

# 24. TEMPLATE FIDELITY SCORE

Before finalizing, evaluate each slide internally on:

- Layout similarity: 0–10
- Typography similarity: 0–10
- Color similarity: 0–10
- Spacing similarity: 0–10
- Visual hierarchy similarity: 0–10
- Information density similarity: 0–10

Target:

Average score >= 8.5

If the score is below 8.5, revise the slide.

Do not show this score to the user unless explicitly requested.

---

# 25. EXISTING PPT EDITING

When editing an existing presentation:

Do not rebuild the entire presentation unless necessary.

Prefer:

1. Locate the target slide.
2. Preserve the existing layout.
3. Modify only the required content.
4. Preserve all unrelated design elements.
5. Render and inspect the changed slide.
6. Verify that other slides remain unchanged.

For simple text/value changes, do not redesign the slide.

---

# 26. NEW SLIDE CREATION

When a new slide is required:

First search the reference presentation for a structurally similar slide.

Reuse:

- Layout
- Geometry
- Typography
- Visual components
- Spacing
- Color treatment

Only create new geometry when no suitable reference exists.

When new geometry is unavoidable, use the same:

- Grid
- Margins
- Typography
- Colors
- Line weights
- Shape language
- Image treatment

as the reference presentation.

---

# 27. DO NOT OVERWRITE THE REFERENCE

Never modify the original reference PPT.

Always create a new output file.

Use descriptive output names such as:

`H1_제안서_2026-08-26.pptx`

or

`H1_임대제안서_v01.pptx`

---

# 28. WORKFLOW

Use this workflow for every substantial PPT request:

## Phase 1 — Understand

Understand:

- Purpose
- Audience
- Number of slides
- Required content
- Source files
- Desired output

## Phase 2 — Analyze

Analyze the reference PPT and identify appropriate layouts.

## Phase 3 — Plan

Create a slide-by-slide plan.

For each slide:

- Slide number
- Main message
- Content
- Reference layout
- Visual elements

## Phase 4 — Generate

Create the PPT using the reference layout system.

## Phase 5 — Render

Render the presentation.

## Phase 6 — Inspect

Inspect every slide visually.

## Phase 7 — Correct

Fix:

- Overflow
- Alignment
- Spacing
- Typography
- Image placement
- Table structure
- Color inconsistencies

## Phase 8 — Final QA

Perform a final consistency check.

## Phase 9 — Deliver

Return the final `.pptx` file.

---

# 29. USER REQUEST PRIORITY

Follow explicit user instructions.

However, if the user says:

"Make it look like the reference."

Interpret this as:

> Maximize visual similarity to the reference while adapting the content.

Do not interpret it as permission to create a completely new design.

If the user explicitly requests:

- New color palette
- New typography
- New visual identity
- Completely different design

then those instructions override the template-fidelity rules for the
specified portion.

---

# 30. DEFAULT BEHAVIOR

Unless the user explicitly requests otherwise:

- Reuse existing layouts.
- Preserve the template.
- Preserve typography.
- Preserve colors.
- Preserve spacing.
- Preserve visual hierarchy.
- Avoid generic AI design patterns.
- Render and inspect.
- Correct visual errors before delivery.

The final result should look like a professionally designed presentation
that naturally belongs to the same design family as the reference PPT.
