# Design System: OLT Huawei Manager
**Project ID:** Local product system

## 1. Visual Theme & Atmosphere
OLT Huawei Manager should feel like a precision operations console for fiber infrastructure, not a marketing dashboard and not a generic admin template. The atmosphere is calm, engineered, and observational. The interface should read as if it was authored for a technical team that needs confidence, speed, and low cognitive friction.

The visual mood should be:
- clear
- technical
- grounded
- light, but not playful
- premium through restraint

This is a bright control surface, not a dark NOC fantasy and not a startup SaaS clone. White space is allowed, but it must be structured. Surfaces should feel mineral, cool, and slightly softened rather than stark or glossy.

## 2. Color Palette & Roles
- **Mineral Mist (#F4F7F8)**: Used for the app background and large layout atmosphere. This is the canvas tone and should replace flat white.
- **Cloud Surface (#FFFFFF)**: Used for primary cards, tables, forms, and high-readability panels.
- **Cold Porcelain (#F8FBFC)**: Used for secondary surfaces, grouped subpanels, and empty states.
- **Steel Outline (#D9E2E8)**: Used for borders, separators, table divisions, and quiet structure lines.
- **Graphite Ink (#1F2E3D)**: Used for primary text, headings, and dense operational information.
- **Slate Copy (#607080)**: Used for secondary text, helper copy, and explanatory metadata.
- **Sea Glass Accent (#2E8B6D)**: Used for active navigation, positive status, and operational match states. This should be present but never dominant.
- **Powder Mint (#EAF7F1)**: Used as the soft surface under Sea Glass Accent elements.
- **Mineral Blue Action (#8EAFF1)**: Used for primary actions and forward-progress controls such as “Salvar”, “Provisionar” and “Atualizar”.
- **Deep Action Ink (#27456F)**: Used as text on blue action buttons and for supporting action emphasis.
- **Warm Amber Signal (#E7B554)**: Used for warning, degraded state, and attention markers.
- **Soft Coral Alert (#E57E73)**: Used for destructive actions, failure, or risk messaging.

Color usage rules:
- Green is for state and confirmation, not for every button.
- Blue is for action and momentum, not for status.
- Red appears only on destructive or error flows.
- Dark fills should be avoided in the main shell except where raw terminal output genuinely needs it.

## 3. Typography Rules
Primary UI type should be a civic, highly legible sans with a technical tone rather than a trendy startup face. It should feel authoritative and invisible at the same time.

Recommended pairing:
- **Primary Sans:** Public Sans
- **Monospace:** IBM Plex Mono

Typography behavior:
- Section titles should be strong, compact, and calm.
- Supporting copy should use softer gray, never low-contrast pastel.
- Micro-labels should use uppercase sparingly with deliberate spacing.
- Metrics, ports, VLANs, serials, and command outputs should use monospace for structural clarity.

Avoid:
- overly geometric “AI dashboard” type
- exaggerated tracking everywhere
- over-styled hero typography inside the app shell

## 4. Component Stylings
* **Buttons:** Generously rounded, compact, and structured. Primary buttons use Mineral Blue Action with dark text. Secondary buttons remain white with steel outlines. Destructive actions use pale coral surfaces with restrained red text.
* **Cards/Containers:** Large rounded containers with cool white surfaces, thin steel outlines, and whisper-soft shadows. Cards should feel precise and layered, never puffy or glassy.
* **Inputs/Forms:** Bright white fields with subtle borders, soft blue focus rings, and consistent spacing. Inputs should feel deliberate and operator-friendly rather than decorative.
* **Status Pills:** Lightly tinted pills with thin outlines. They should read like annotations, not badges shouting for attention.
* **Tables:** Clean white rows, crisp headers, restrained hover states, and monospace only where the data is structural.

## 5. Layout Principles
The interface should have a strong frame:
- a stable left rail
- a calm header
- a spacious content field
- clearly nested panels

Spacing should prioritize rhythm over density:
- strong outer page margins
- softer internal card padding
- visible grouping between overview, actions, and detail

The layout should not chase visual spectacle. It should support fast scanning:
- first read: where am I
- second read: what matters now
- third read: what can I do next

If a screen feels like a dashboard collage, it is wrong.
If a screen feels like an operational briefing surface, it is right.
