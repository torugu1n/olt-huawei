# DESIGN.md

## Product Intent

OLT Huawei Manager is an operations console, not a startup landing page.
It should feel like a serious network control surface:

- calm
- precise
- technical
- confident
- fast to scan

The UI should avoid looking like generic AI-generated dashboards.
It should feel authored.

## Primary Inspiration

Inspired by the DESIGN.md collection from:

- https://github.com/voltagent/awesome-design-md

Especially the visual language described for VoltAgent:

- void-dark surfaces
- emerald accent
- terminal-native tone
- developer-tool clarity

This project should not become a clone of VoltAgent.
Use that direction as a design grammar, then adapt it to fiber/Olt operations.

## Design Personality

Think:

- network operations room
- engineered, not playful
- modern utility software
- minimal, but not sterile

Avoid:

- default blue SaaS dashboard look
- emoji-heavy navigation
- generic gradient-on-white startup visuals
- purple neon AI cliché
- oversized marketing copy inside app screens

## Color System

Core palette:

- background: warm technical mist, not flat white
- shell/sidebar: near-black green
- primary accent: emerald
- support neutrals: soft graphite and muted stone
- danger: restrained red
- success: dark mint, not bright green
- warning: warm amber

Use accent color sparingly.
Accent is for:

- active nav
- primary actions
- selected states
- operational emphasis

Do not turn every element green.

## Typography

Primary font:

- geometric grotesk or technical sans

Monospace:

- reserved for serials
- ports
- command outputs
- metrics

Typography should create hierarchy through:

- scale
- spacing
- casing
- weight

Not through random color shifts.

Prefer:

- compact uppercase micro-labels
- strong section titles
- muted supporting text

## Layout Principles

The app should feel like a control surface with a strong frame:

- sculpted sidebar
- spacious content canvas
- soft layered backgrounds
- clear panels

Use:

- rounded large containers
- translucent surfaces where appropriate
- subtle borders
- strong spacing rhythm

Avoid:

- cramped cards
- default table styling
- too many equal-weight boxes

## Component Language

### Sidebar

Should feel premium and operational:

- dark shell
- compact labels
- consistent icon treatment
- active state with depth

No emoji icons.

### Cards

Cards should feel like instrument panels:

- soft elevation
- subtle border
- clear value emphasis
- restrained supporting metadata

### Tables

Tables are a core product surface.
They must be:

- highly legible
- compact but breathable
- easy to scan row by row

Use:

- strong headers
- clear zebra or hover behavior
- monospace where data is structural
- action controls that don’t visually scream

### Forms

Forms should feel deliberate and operator-friendly:

- strong grouping
- descriptive helper text
- prominent current context
- minimal friction

For provisioning flows, highlight:

- PON
- VLAN
- service profile
- line profile
- GEM

as operational facts, not generic form fields.

## Motion

Motion should be sparse and useful.

Use only:

- soft fade/slide on page entry
- subtle panel hover transitions
- loading shimmer or pulse when operationally useful

Avoid:

- flashy dashboard animations
- bouncing counters
- decorative motion loops

## Content Style

Language should be:

- direct
- operational
- clear
- low-drama

Examples:

- “ONT provisionada”
- “Template aplicado para PON 0/1/7”
- “OLT temporariamente indisponível”

Avoid fluffy product copy.

## Page-Specific Guidance

### Login

Should feel like access to an operations system.
Less marketing, more control and trust.

### Dashboard

Should prioritize:

- current OLT health
- ONTs online/offline
- alarms
- autofind queue

The first screen must read like an operational summary, not a KPI gallery.

### Autofind

Should feel actionable.
Each row must make it obvious:

- where the ONT was found
- what template will be used
- what happens next

### Provision

Should look like a guided operational workflow.
Context and template data should feel embedded into the UI, not hidden in plain inputs.

### ONTs

Should feel like an inventory console:

- dense but readable
- excellent scanability
- clear operational status

## Implementation Notes

When redesigning:

- prefer improving shared primitives first
- keep pages visually consistent
- avoid introducing random styles per page
- preserve responsiveness
- preserve readability on smaller screens

## Rule of Thumb

If a screen looks like a generic admin template, it is wrong.
If it looks like a serious fiber/network operations console with a modern crafted finish, it is right.
