import * as React from "react"

interface RefrasaSquareIconProps extends React.SVGProps<SVGSVGElement> {
  strokeWidth?: number
}

export function RefrasaSquareIcon({
  strokeWidth = 1.5,
  ...props
}: RefrasaSquareIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16V8H12.2C13.1941 8 14 8.80589 14 9.8V10.2C14 11.1941 13.1941 12 12.2 12H10M12.3 12L14.2 16"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
