# Education reader

How the Education hub and its programs (Jung, Frankl, Plato and the rest) sit on the screen.

Asked for 2026-11-06: "make it work well in fullscreen for computers, so it is not fragmented, and make the images work well when read on phones, so they are not too much bigger than the phone screen."

## Computers (1024px wide and up)

- The hub and every reader fill the whole window above the dock. No centred narrow column.
- Hub rows wrap and fill the width, instead of scrolling sideways.
- A program's intro and its pages are two columns: the image on the left, the words on the right. Both are visible at once and the page itself does not scroll. Long words scroll inside their column.
- The intro's title, numbers and *Begin* stay together in the middle of their column.
- The image is never taller than the space between the top bar and the bottom bar.
- Programs whose words sit on the image (`TEXT_ON_IMAGE_PROGRAMS`) use the same two columns, with the words moved beside the image.
- Programs with layered pages (the three-part guides such as Jung) stay one centred image with the text box on it, sized so the whole image shows.

## Phones

- The page never runs wider than the screen. The cause was the top navigation's row, which pushed the page wider; it now scrolls within itself.
- An image takes at most 60% of the screen height, or 76% when the words sit on top of it. The words start under it, visible without scrolling.
- The reader's top bar stays on one line: the program title shortens, the page count, text size and *back* keep their size.

## States and edge cases

- Nothing sits under the dock: the reader stops at `--dock-height`.
- The reader covers the hub fully, so hub controls do not show through it, whichever hub palette is chosen.
- Images keep their shape. They shrink to fit and are never cropped in the reader. The hub's top picture may crop, at most 38% of the screen height.
