"use client"

import { Id } from "../../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
// Filter imports - hidden, not functional
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select"
import {
    FileTextIcon,
    CodeIcon,
    ListIcon,
    TableIcon,
    BookOpenIcon,
    FunctionSquareIcon,
    // FilterIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Artifact type from Convex (matches schema)
type ArtifactType = "code" | "outline" | "section" | "table" | "citation" | "formula"

interface Artifact {
    _id: Id<"artifacts">
    title: string
    type: ArtifactType
    version: number
    createdAt: number
}

interface ArtifactListProps {
    artifacts: Artifact[]
    selectedId: Id<"artifacts"> | null
    onSelect: (id: Id<"artifacts">) => void
    typeFilter: ArtifactType | null
    onFilterChange: (type: ArtifactType | null) => void
}

// Map artifact type to icon
const typeIcons: Record<ArtifactType, React.ElementType> = {
    code: CodeIcon,
    outline: ListIcon,
    section: FileTextIcon,
    table: TableIcon,
    citation: BookOpenIcon,
    formula: FunctionSquareIcon,
}

// Map artifact type to display label (Indonesian)
const typeLabels: Record<ArtifactType, string> = {
    code: "Code",
    outline: "Outline",
    section: "Section",
    table: "Tabel",
    citation: "Sitasi",
    formula: "Formula",
}

// Filter options - hidden, not functional
// const filterOptions: { value: string; label: string }[] = [
//     { value: "all", label: "Semua" },
//     { value: "code", label: "Code" },
//     { value: "outline", label: "Outline" },
//     { value: "section", label: "Section" },
//     { value: "table", label: "Tabel" },
//     { value: "citation", label: "Sitasi" },
//     { value: "formula", label: "Formula" },
// ]

// Format timestamp to readable date
function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
    })
}

export function ArtifactList({
    artifacts,
    selectedId,
    onSelect,
    typeFilter: _typeFilter,      // Filter hidden - not functional
    onFilterChange: _onFilterChange,  // Filter hidden - not functional
}: ArtifactListProps) {
    // Filter handler - hidden, not functional
    // const handleFilterChange = (value: string) => {
    //     if (value === "all") {
    //         onFilterChange(null)
    //     } else {
    //         onFilterChange(value as ArtifactType)
    //     }
    // }

    return (
        <div className="flex flex-col h-full">
            {/* Filter hidden - not functional
            <div className="p-3 border-b space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FilterIcon className="h-4 w-4" />
                    <span>Filter</span>
                </div>
                <Select
                    value={typeFilter ?? "all"}
                    onValueChange={handleFilterChange}
                >
                    <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Filter berdasarkan tipe" />
                    </SelectTrigger>
                    <SelectContent>
                        {filterOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            */}

            {/* Artifact list */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {artifacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                        <FileTextIcon className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-xs">Belum ada artifact</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {artifacts.map((artifact) => {
                            const TypeIcon = typeIcons[artifact.type]
                            const isSelected = selectedId === artifact._id

                            return (
                                <button
                                    key={artifact._id}
                                    onClick={() => onSelect(artifact._id)}
                                    className={cn(
                                        "w-full p-2 rounded-lg text-left transition-colors",
                                        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
                                        isSelected && "bg-accent text-accent-foreground"
                                    )}
                                    aria-label={`Select artifact: ${artifact.title}`}
                                    aria-pressed={isSelected}
                                >
                                    <div className="flex items-start gap-2">
                                        <TypeIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium truncate">
                                                    {artifact.title}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 text-[10px] px-1 py-0"
                                                >
                                                    v{artifact.version}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] px-1 py-0 capitalize"
                                                >
                                                    {typeLabels[artifact.type]}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDate(artifact.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer removed - count shown in collapsible trigger */}
        </div>
    )
}
