# Component Selection

Use this table when the user describes the need but not the component name.

| Need | Component |
| --- | --- |
| Primary action or button row | `Button` |
| Basic text entry | `Input`, `Textarea` |
| Structured form layout | `FieldGroup`, `Field`, `FieldSet` |
| Input with icon, text, or inline action | `InputGroup` |
| Select from fixed options | `Select`, `RadioGroup`, `Checkbox`, `Switch` |
| Toggle between a few options | `ToggleGroup` |
| Dense data display | `Table`, `Card`, `Badge`, `Avatar` |
| App navigation | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination` |
| Modal or confirmation | `Dialog`, `Sheet`, `Drawer`, `AlertDialog` |
| Feedback and progress | `Alert`, `Progress`, `Skeleton`, `Spinner`, `sonner` |
| Command palette | `Command` inside `Dialog` |
| Charts | `Chart` |
| Layout primitives | `Card`, `Separator`, `ScrollArea`, `Accordion`, `Collapsible`, `Resizable` |
| Empty state | `Empty` |
| Menus | `DropdownMenu`, `ContextMenu`, `Menubar` |
| Inline help or preview | `Tooltip`, `HoverCard`, `Popover` |

Default to the smallest component that solves the interaction cleanly.

If multiple components could work:

- prefer the one already installed in the target app
- prefer the one with the simplest accessibility story
- prefer composition over custom wrappers
