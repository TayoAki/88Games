# Original artwork

`spades-hero.png` was generated for this project using the image generation tool on 2026-10-22. It is bundled locally and also used as the initial app icon. There is no runtime image-generation or image-download requirement.

Creative brief: premium ivory Spades cards fanned above midnight navy, engraved copper ornaments, teal ambient glow and orbital gold lines; no lettering or borrowed branding. This is decorative artwork; playable card ranks and suits are drawn as native text so every actual game card stays unambiguous.

Card entry animation is implemented in `App.tsx` with React Native Animated (opacity and vertical translation). No external animation files are required. OS reduced motion disables the transition duration.
