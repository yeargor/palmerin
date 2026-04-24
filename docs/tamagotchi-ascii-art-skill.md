# Tamagotchi ASCII Art Skill

Use this skill when you need to draw tiny terminal pets matching the Buddy companion style from this codebase.

Reference files:

- Sprite bodies and animation frames: [`/home/yahor/PycharmProjects/claude-code/src/buddy/sprites.ts`](/home/yahor/PycharmProjects/claude-code/src/buddy/sprites.ts)
- Species list: [`/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts`](/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts)
- Eye options: [`/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts`](/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts)
- Hat options: [`/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts`](/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts)
- Rarity-to-color mapping: [`/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts`](/home/yahor/PycharmProjects/claude-code/src/buddy/types.ts)
- Terminal theme color values: [`/home/yahor/PycharmProjects/claude-code/src/utils/theme.ts`](/home/yahor/PycharmProjects/claude-code/src/utils/theme.ts)

## Style

These pets have a specific style: **tiny monospaced terminal pets in a chibi/kawaii ASCII/Unicode art style**.

More precisely, this is not pure ASCII. The sprites may use Unicode characters such as `ω`, `·`, `✦`, `◉`, `°`, and `´`. A better name for the style is **monospace terminal sprite / ASCII-style Unicode pet sprite**.

## Core Characteristics

- Size: **about 12 characters wide and 5 lines tall**.
- The first line is often reserved for a hat: crown, wizard hat, halo, and similar accessories.
- The figure is very small and should read as an **icon-like sprite**, not a detailed illustration.
- The pet is usually shown **front-facing or slightly side-facing**.
- Shapes are rounded: use many `(`, `)`, `.----.`, `` `----´ ``, `______`, and similar simple contours.
- The face is usually built around two replaceable eyes: `{E}` and `{E}`.
- The body uses simple outlines, with no texture and no complex shading.
- Color is one solid terminal color for the whole sprite, based on rarity, not on body parts.
- Silhouette matters more than detail: cat ears, turtle shell, octopus tentacles, mushroom cap, robot head, and so on.
- Most species have a light idle animation: usually 3 frames where only the tail, ear, mouth, feet, bubbles, antennae, or one line changes.
- The style is intentionally toy-like: small, symmetrical, friendly, and slightly tamagotchi / virtual pet-like.

## Example

Cat with `@` eyes and a wizard hat:

```text
    /^\     
   /\_/\    
  ( @   @)  
  (  ω  )   
  (")_(")   
```

## Prompt For An AI

Use this English prompt when asking another AI to create a matching pet:

```text
Draw a tiny monospace terminal pet sprite in a kawaii tamagotchi style.
Use a fixed 12-character-wide by 5-line-tall grid.
Use simple ASCII/Unicode punctuation only, with lots of rounded shapes.
The pet should face forward, have a cute simplified face, two replaceable eyes,
minimal details, no shading, no background, and a single-color terminal look.
Reserve the first line for an optional hat. Keep the silhouette readable at very small size.
```

Russian version:

```text
Нарисуй маленького терминального питомца в стиле kawaii tamagotchi ASCII/Unicode art.
Размер: 12 символов в ширину и 5 строк в высоту, моноширинный шрифт.
Используй только простые символы пунктуации и Unicode-символы.
Форма должна быть округлой, милой, легко читаемой по силуэту.
Питомец смотрит вперёд, у него два выразительных глаза, минимум деталей,
без фона, без штриховки, как одноцветный терминальный спрайт.
Первую строку оставь под маленькую шапку или аксессуар.
```

## Project-Specific Constraints

When matching this project exactly:

```text
Use a 5-line sprite, around 12 columns wide.
Line 1 is an optional hat slot.
Use {E} placeholders for both eyes.
Make three idle animation frames with only tiny changes between frames.
The sprite should still look good when rendered in one terminal color.
```

## Visual Debug Verification

When validating profile sprites in the UI, take screenshots with sprite debug mode enabled:

```text
?debugSprite=1
```

For class-specific checks, combine it with the target profile:

```text
/apps/web/index.html?startapp=mage&debugSprite=1
```

The debug screenshot is the required artifact for sprite rendering fixes because it shows the rendered sprite together with alignment guides, computed font metrics, line widths, glyph widths, viewport data, and the current URL. Normal screenshots are useful for final visual review, but they are not enough to diagnose spacing, font, cache, or per-origin rendering problems.

## Vocabulary

Useful style keywords:

- **tiny terminal pet sprite**
- **monospace ASCII-style Unicode art**
- **kawaii tamagotchi companion**
- **5-line chibi creature**
- **single-color terminal mascot**

## Available Parts

Species in the current implementation:

- `duck`
- `goose`
- `blob`
- `cat`
- `dragon`
- `octopus`
- `owl`
- `penguin`
- `turtle`
- `snail`
- `ghost`
- `axolotl`
- `capybara`
- `cactus`
- `robot`
- `rabbit`
- `mushroom`
- `chonk`

Eye options:

```text
· ✦ × ◉ @ °
```

Hat options:

- `none`
- `crown`
- `tophat`
- `propeller`
- `halo`
- `wizard`
- `beanie`
- `tinyduck`

Rarity colors:

- `common` -> `inactive`: gray
- `uncommon` -> `success`: green
- `rare` -> `permission`: blue / blue-violet
- `epic` -> `autoAccept`: violet / magenta
- `legendary` -> `warning`: yellow / amber

Example dark theme values:

```text
common     gray          rgb(153,153,153)
uncommon   green         rgb(78,186,101)
rare       light blue    rgb(177,185,249)
epic       violet        rgb(175,135,255)
legendary  amber         rgb(255,193,7)
```

## Custom Examples

### User Custom Tamagotchi 1: Anime Warrior With Sword And Shield

Plain preview:

```text
    /\      
  ( ·  ·) / 
 <( ^ )>\/  
  /|___|\   
  /_/ \_\   
```

Colored terminal preview:

```text
    /\      
  ( ·  ·) [90m/[0m 
 [38;5;94m<( ^ )>[0m[90m\/[0m  
  /|___|\   
  /_/ \_\   
```

Color notes:

- Shield and center spike: brown, `ANSI 256-color 38;5;94`.
- Sword: gray, `ANSI 90`.
