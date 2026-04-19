# AGENTS.md

## Always follow High-Level Rules
- Before every response, check whether the preview server is running; if not, start it.
- Keep the preview server running until the user explicitly asks to stop it.
- Treat sprite rendering as a layout-stability task first, visual styling second.
- Any sprite/profile change must preserve existing UI geometry unless the user explicitly asks to move/resize elements.
- Use canonical sprite sources from `docs/` as the single source of truth for shape and spacing.
- Do not report completion for sprite tasks without visual verification on mobile-sized viewports.

## Documentation Map
- `docs/concept.md` - product concept and core direction.
- `docs/concept_details.md` - detailed feature intent and behavior notes.
- `docs/tamagotchi-ascii-art-skill.md` - ASCII style and color references.
- `docs/warrior_sprite.txt` - canonical warrior sprite.
- `docs/mage_sprite.txt` - canonical mage sprite.
