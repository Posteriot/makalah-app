# Task Report: 1.1 - Migrate GlobalHeader

> **Fase**: FASE 1 - Global Shell
> **Task**: 1.1 - Migrate GlobalHeader
> **Status**: ⏳ Pending User Validation
> **Date**: 2026-02-04

## Summary

Migrasi semua ikon di GlobalHeader dan UserDropdown dari `lucide-react` ke `iconoir-react`.

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/header/GlobalHeader.tsx` | Modified | Replaced lucide-react imports with iconoir-react |
| `src/components/layout/header/UserDropdown.tsx` | Modified | Replaced lucide-react imports with iconoir-react |

## Icon Mapping Applied

| Lucide (Before) | Iconoir (After) | Usage |
|-----------------|-----------------|-------|
| Menu | Menu | Mobile menu toggle |
| X | Xmark | Close mobile menu |
| Sun | SunLight | Theme toggle (light mode icon) |
| Moon | HalfMoon | Theme toggle (dark mode icon) |
| ChevronDown | NavArrowDown | Dropdown chevron |
| Loader2 | RefreshDouble | Loading spinner |
| User | User | User menu item |
| CreditCard | CreditCard | Subscription menu item |
| Settings | Settings | Admin panel menu item |
| LogOut | LogOut | Sign out menu item |

## Code Changes

### GlobalHeader.tsx - Import Statement
```tsx
// Before (lucide-react)
import {
  Menu,
  X,
  Sun,
  Moon,
  User,
  CreditCard,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react"

// After (iconoir-react)
import {
  Menu,
  Xmark,
  SunLight,
  HalfMoon,
  User,
  CreditCard,
  Settings,
  LogOut,
  RefreshDouble,
} from "iconoir-react"
```

### UserDropdown.tsx - Import Statement
```tsx
// Before (lucide-react)
import {
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
  User,
  CreditCard,
} from "lucide-react"

// After (iconoir-react)
import {
  Settings,
  LogOut,
  NavArrowDown,
  RefreshDouble,
  User,
  CreditCard,
} from "iconoir-react"
```

## Verification

### Build Check
```bash
$ npm run build
✓ Compiled successfully in 14.6s
✓ Running TypeScript ...
✓ Generating static pages...
```
**Result**: ✅ Build passed

### Icon Class Compatibility
- All Iconoir icons accept same className props as Lucide
- Sizing via `h-4 w-4`, `h-5 w-5` works identically
- Animation classes (`animate-spin`) work correctly with RefreshDouble

## Visual Checklist

- [ ] Mobile menu toggle icon renders correctly
- [ ] Mobile menu close (X) icon renders correctly
- [ ] Theme toggle sun/moon icons render correctly
- [ ] User dropdown chevron animates on open/close
- [ ] Loading spinner appears during sign out
- [ ] All menu item icons render correctly

## Notes

1. **Icon naming differences**: Iconoir uses more descriptive names (e.g., `Xmark` instead of `X`, `NavArrowDown` instead of `ChevronDown`)

2. **Coexistence**: Both lucide-react and iconoir-react are installed. Full lucide removal scheduled for FASE 10.

3. **No visual changes expected**: Icons from both libraries follow similar sizing (24x24 viewBox), so visual appearance should be nearly identical.

## Next Steps

After user validation:
1. Mark task as Done in plan document
2. Commit changes
3. Proceed to Task 1.2 - Migrate Footer Standard
