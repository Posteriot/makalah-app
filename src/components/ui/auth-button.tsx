import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuthButtonProps {
  href?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  active?: boolean
  disabled?: boolean
  ariaExpanded?: boolean
  ariaHaspopup?: boolean | "true" | "menu" | "dialog" | "listbox" | "tree" | "grid"
  ariaLabel?: string
  target?: React.HTMLAttributeAnchorTarget
  rel?: string
  onClick?: () => void
  type?: "button" | "submit" | "reset"
}

export function AuthButton({
  href,
  children,
  className,
  contentClassName,
  active = false,
  disabled = false,
  ariaExpanded,
  ariaHaspopup,
  ariaLabel,
  target,
  rel,
  onClick,
  type = "button",
}: AuthButtonProps) {
  const classes = cn(
    "group relative overflow-hidden rounded-action",
    "inline-flex items-center justify-center gap-2 px-2 py-1",
    "border-[length:var(--core-u-border-hairline-width)] border-transparent",
    "bg-[color:var(--core-auth-btn-bg)] text-[color:var(--core-auth-btn-fg)]",
    "transition-colors duration-200 focus-ring",
    "hover:border-[color:var(--core-auth-btn-hover-border)] hover:bg-transparent hover:text-[color:var(--core-auth-btn-hover-fg)]",
    active && "border-[color:var(--core-auth-btn-hover-border)] bg-transparent text-[color:var(--core-auth-btn-hover-fg)]",
    disabled && "cursor-not-allowed opacity-60",
    className
  )

  const content = (
    <>
      <span
        className={cn(
          "auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] opacity-0",
          "transition-transform duration-300 ease-out transition-opacity",
          "group-hover:translate-x-0 group-hover:opacity-100",
          active && "translate-x-0 opacity-100"
        )}
        aria-hidden="true"
      />
      <span className={cn("relative z-10 inline-flex items-center gap-2 whitespace-nowrap", contentClassName)}>
        {children}
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={classes}
        aria-disabled={disabled || undefined}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
      data-active={active ? "true" : "false"}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  )
}
