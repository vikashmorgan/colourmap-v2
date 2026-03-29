# Critical Rules

Use these as hard constraints when adding, updating, or reviewing shadcn/ui code.

## Styling And Tailwind

- Use `className` for layout and spacing, not to restyle component colors or typography.
- Use semantic tokens such as `bg-background`, `text-muted-foreground`, and `border-border`. Avoid raw palette classes like `bg-blue-500`.
- Use `gap-*`, not `space-x-*` or `space-y-*`.
- Use `size-*` when width and height are equal.
- Use `truncate` instead of manually combining overflow and ellipsis utilities.
- Use `cn()` for conditional classes instead of hand-written string concatenation.
- Do not add manual `z-index` hacks to overlay components such as `Dialog`, `Sheet`, or `Popover`.

## Forms And Inputs

- Prefer `FieldGroup` and `Field` for form layout instead of ad-hoc wrapper `div`s.
- Inside `InputGroup`, use `InputGroupInput` or `InputGroupTextarea`, not raw `Input` or `Textarea`.
- Put buttons or helper content inside `InputGroupAddon`.
- Use `FieldSet` and `FieldLegend` for grouped radios or checkboxes.
- Validation state should be expressed on both wrapper and control: `data-invalid` on the field wrapper and `aria-invalid` on the input control.
- For a small fixed set of choices, prefer `ToggleGroup` over looping custom buttons with manual active state.

## Composition

- Keep item primitives inside their corresponding group primitives.
- Use `asChild` or `render` according to the project's configured base from `info --json`; do not assume Radix APIs if the project uses Base UI.
- `Dialog`, `Sheet`, and `Drawer` need a title for accessibility. Use a visually hidden title if necessary.
- Use the full card structure when a card needs header, description, content, or footer.
- `TabsTrigger` belongs inside `TabsList`.
- `Avatar` needs `AvatarFallback`.
- For loading buttons, compose `Spinner` with `Button`; do not invent a custom `isLoading` prop.

## Use Components Instead Of Custom Markup

- `Alert` for callouts
- `Empty` for empty states
- `Separator` instead of custom divider markup
- `Skeleton` for loading placeholders
- `Badge` instead of custom status pills
- `toast()` from `sonner` for toasts

## Icons

- In `Button`, use icon placement attributes such as `data-icon="inline-start"` or `data-icon="inline-end"`.
- Do not add manual sizing classes to icons inside shadcn components unless the component docs specifically require it.
- Pass icon components directly; do not invent string-to-icon lookup layers unless the app already has one for another reason.
