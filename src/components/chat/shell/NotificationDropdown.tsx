"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { BellIcon, FileTextIcon, InfoIcon, DownloadIcon, MessageSquareIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Notification item types
 */
type NotificationType = "paper" | "system" | "export" | "feedback"

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
}

/**
 * Mock notifications for initial state
 * In production, this would come from a Convex query
 */
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    type: "paper",
    title: 'Paper "Deteksi Perubahan Code" approved',
    description: "Idea Stage has been approved. Continue to Topic stage.",
    time: "2 menit lalu",
    read: false,
  },
  {
    id: "2",
    type: "system",
    title: "System updated",
    description: "New feature: Export to PDF with APA format.",
    time: "15 menit lalu",
    read: false,
  },
  {
    id: "3",
    type: "export",
    title: "Word export successful",
    description: 'Document "Riset AI Healthcare" ready to download.',
    time: "1 jam lalu",
    read: true,
  },
  {
    id: "4",
    type: "feedback",
    title: "Revision requested",
    description: "Methodology Stage needs improvement in the sampling section.",
    time: "3 jam lalu",
    read: true,
  },
  {
    id: "5",
    type: "paper",
    title: "New paper started",
    description: 'Session "Tanya Format Referensi APA" created.',
    time: "Kemarin",
    read: true,
  },
]

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "paper":
      return <FileTextIcon className="h-4 w-4" />
    case "system":
      return <InfoIcon className="h-4 w-4" />
    case "export":
      return <DownloadIcon className="h-4 w-4" />
    case "feedback":
      return <MessageSquareIcon className="h-4 w-4" />
    default:
      return <BellIcon className="h-4 w-4" />
  }
}

/**
 * Get icon background color for notification type
 */
function getIconBgClass(type: NotificationType) {
  switch (type) {
    case "paper":
      return "bg-primary/15 text-primary"
    case "system":
      return "bg-info/15 text-info"
    case "export":
      return "bg-success/15 text-success"
    case "feedback":
      return "bg-warning/15 text-warning"
    default:
      return "bg-muted text-muted-foreground"
  }
}

/**
 * NotificationDropdown - Basic notification UI
 *
 * Features:
 * - Bell icon with badge dot (unread indicator)
 * - Dropdown menu with max 5 items
 * - Mark as read functionality (local state for now)
 * - "Show all" button (placeholder for future modal)
 * - Click-outside-to-close pattern
 * - ESC key handler
 */
export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length
  const hasUnread = unreadCount > 0

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  // Mark single notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // Handle show all (placeholder for future modal)
  const handleShowAll = useCallback(() => {
    // TODO: Open notifications modal
    console.log("Show all notifications")
    setIsOpen(false)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center",
          "w-9 h-9 rounded-lg",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "transition-colors duration-150"
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="h-5 w-5" />
        {/* Badge dot */}
        {hasUnread && (
          <span
            className={cn(
              "absolute top-1.5 right-1.5",
              "w-2 h-2 rounded-full",
              "bg-destructive"
            )}
            aria-label={`${unreadCount} unread notifications`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2",
            "w-80 max-h-[400px]",
            "bg-popover border border-border rounded-lg shadow-lg",
            "z-50 overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {hasUnread && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[280px] scrollable">
            {notifications.slice(0, 5).map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3",
                  "text-left transition-colors duration-150",
                  "hover:bg-accent",
                  !notification.read && "bg-muted/50"
                )}
              >
                {/* Unread indicator */}
                <div
                  className={cn(
                    "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                    notification.read ? "bg-transparent" : "bg-primary"
                  )}
                />

                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center",
                    "w-8 h-8 rounded-lg flex-shrink-0",
                    getIconBgClass(notification.type)
                  )}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.time}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <button
              onClick={handleShowAll}
              className={cn(
                "w-full flex items-center justify-center gap-1",
                "px-4 py-2 rounded-lg",
                "text-sm text-primary hover:bg-accent",
                "transition-colors duration-150"
              )}
            >
              Show all
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
