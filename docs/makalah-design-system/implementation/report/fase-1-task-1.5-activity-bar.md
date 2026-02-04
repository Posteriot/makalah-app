# Task Report: 1.5 - Migrate ActivityBar

> **Fase**: FASE 1 - Global Shell
> **Task**: 1.5 - Migrate ActivityBar
> **Status**: ⏳ Pending User Validation
> **Date**: 2026-02-04

## Summary

Migrasi semua ikon di ActivityBar dari `lucide-react` ke `iconoir-react`.

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `src/components/chat/shell/ActivityBar.tsx` | Modified | Replaced lucide-react imports with iconoir-react |

## Icon Mapping Applied

| Lucide (Before) | Iconoir (After) | Usage |
|-----------------|-----------------|-------|
| MessageSquareIcon | ChatBubble | Chat History panel |
| FileTextIcon | Page | Paper Sessions panel |
| GitBranchIcon | GitBranch | Progress Timeline panel |
| ChevronsLeftIcon | FastArrowLeft | Collapse sidebar |
| ChevronsRightIcon | FastArrowRight | Expand sidebar |

## Code Changes

### Import Statement
```tsx
// Before (lucide-react)
import {
  MessageSquareIcon,
  FileTextIcon,
  GitBranchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

// After (iconoir-react)
import {
  ChatBubble,
  Page,
  GitBranch,
  FastArrowLeft,
  FastArrowRight,
} from "iconoir-react"
```

### Panel Items Array
```tsx
// Before
icon: <MessageSquareIcon className="h-5 w-5" aria-hidden="true" />
icon: <FileTextIcon className="h-5 w-5" aria-hidden="true" />
icon: <GitBranchIcon className="h-5 w-5" aria-hidden="true" />

// After
icon: <ChatBubble className="h-5 w-5" aria-hidden="true" />
icon: <Page className="h-5 w-5" aria-hidden="true" />
icon: <GitBranch className="h-5 w-5" aria-hidden="true" />
```

### Sidebar Toggle
```tsx
// Before
<ChevronsRightIcon className="h-5 w-5" aria-hidden="true" />
<ChevronsLeftIcon className="h-5 w-5" aria-hidden="true" />

// After
<FastArrowRight className="h-5 w-5" aria-hidden="true" />
<FastArrowLeft className="h-5 w-5" aria-hidden="true" />
```

## Verification

### Build Check
```bash
$ npm run build
✓ Compiled successfully
✓ Running TypeScript ...
✓ Generating static pages...
```
**Result**: ✅ Build passed

## Visual Checklist

- [ ] ChatBubble icon for Chat History panel
- [ ] Page icon for Paper Sessions panel
- [ ] GitBranch icon for Progress Timeline panel
- [ ] FastArrowLeft/Right for sidebar toggle
- [ ] Active state indicator working
- [ ] Tooltip content displays correctly
- [ ] Icon size (h-5 w-5 = 20px) correct

## Notes

1. **Naming convention**: Iconoir uses more semantic names:
   - `MessageSquare` → `ChatBubble`
   - `FileText` → `Page`
   - `ChevronsLeft/Right` → `FastArrowLeft/Right`

2. **Exact match**: `GitBranch` exists in both libraries with same name.

3. **Accessibility preserved**: `aria-hidden="true"` maintained on all icons.

## Next Steps

After user validation:
1. Mark task as Done in plan document
2. Commit changes
3. Proceed to Task 1.6 - Migrate SidebarChatHistory
