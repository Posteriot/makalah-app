"use client"

import { Badge } from "@/components/ui/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight } from "iconoir-react"
import { type ComponentProps, useCallback, useEffect, useState, createContext, useContext } from "react"

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined)

const useCarouselApi = () => {
  const api = useContext(CarouselApiContext)
  return api
}

export type InlineCitationProps = ComponentProps<"span">
export const InlineCitation = ({ className, ...props }: InlineCitationProps) => (
  <span className={cn("inline-flex items-center gap-1", className)} {...props} />
)

export type InlineCitationTextProps = ComponentProps<"span">
export const InlineCitationText = ({ className, ...props }: InlineCitationTextProps) => (
  <span className={cn("transition-colors group-hover:bg-accent", className)} {...props} />
)

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>
export const InlineCitationCard = (props: InlineCitationCardProps) => (
  <HoverCard closeDelay={180} openDelay={0} {...props} />
)

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[]
}

const formatHostname = (raw: string) => {
  try {
    const url = new URL(raw)
    return url.hostname.replace(/^www\./i, "")
  } catch {
    return raw.replace(/^www\./i, "")
  }
}

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => {
  const hostname = sources.length > 0 ? formatHostname(sources[0]) : "sumber"
  const suffix = sources.length > 1 ? ` +${sources.length - 1}` : ""

  return (
    <HoverCardTrigger>
      <Badge
        className={cn(
          "ml-1 rounded-sm border border-slate-300 bg-slate-200 px-2.5 py-0.5 font-mono text-xs font-normal text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:shadow-none",
          className
        )}
        variant="secondary"
        {...(props as ComponentProps<typeof Badge>)}
      >
        {hostname}
        {suffix}
      </Badge>
    </HoverCardTrigger>
  )
}

export type InlineCitationCardBodyProps = ComponentProps<"div">
export const InlineCitationCardBody = ({ className, ...props }: InlineCitationCardBodyProps) => (
  <HoverCardContent className={cn("w-80 max-w-[90vw] p-0", className)} {...props} />
)

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>
export const InlineCitationCarousel = ({
  className,
  children,
  ...props
}: InlineCitationCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>()

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel className={cn("w-full", className)} setApi={setApi} {...props}>
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  )
}

export type InlineCitationCarouselContentProps = ComponentProps<"div">
export const InlineCitationCarouselContent = (props: InlineCitationCarouselContentProps) => (
  <CarouselContent {...props} />
)

export type InlineCitationCarouselItemProps = ComponentProps<"div">
export const InlineCitationCarouselItem = ({
  className,
  ...props
}: InlineCitationCarouselItemProps) => (
  <CarouselItem className={cn("w-full space-y-2 p-4", className)} {...props} />
)

export type InlineCitationCarouselHeaderProps = ComponentProps<"div">
export const InlineCitationCarouselHeader = ({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2",
      className
    )}
    {...props}
  />
)

export type InlineCitationCarouselIndexProps = ComponentProps<"div">
export const InlineCitationCarouselIndex = ({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) => {
  const api = useCarouselApi()
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }
    const unsubscribe = api.on("select", () => {
      forceRender((value) => value + 1)
    })
    return () => unsubscribe()
  }, [api])

  const count = api ? api.scrollSnapList().length : 0
  const current = api ? api.selectedScrollSnap() + 1 : 0

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  )
}

export type InlineCitationCarouselPrevProps = ComponentProps<"button">
export const InlineCitationCarouselPrev = ({
  className,
  ...props
}: InlineCitationCarouselPrevProps) => {
  const api = useCarouselApi()
  const handleClick = useCallback(() => {
    api?.scrollPrev()
  }, [api])

  return (
    <button
      aria-label="Previous"
      className={cn("shrink-0", className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowLeft className="size-4 text-muted-foreground" />
    </button>
  )
}

export type InlineCitationCarouselNextProps = ComponentProps<"button">
export const InlineCitationCarouselNext = ({
  className,
  ...props
}: InlineCitationCarouselNextProps) => {
  const api = useCarouselApi()
  const handleClick = useCallback(() => {
    api?.scrollNext()
  }, [api])

  return (
    <button
      aria-label="Next"
      className={cn("shrink-0", className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowRight className="size-4 text-muted-foreground" />
    </button>
  )
}

export type InlineCitationSourceProps = ComponentProps<"div"> & {
  title?: string
  url?: string
  description?: string
}

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => (
  <div className={cn("space-y-1", className)} {...props}>
    {title && (
      <h4 className="font-medium text-sm leading-tight">{title}</h4>
    )}
    {url && (
      (() => {
        let displayUrl = url
        try {
          const parsed = new URL(url)
          displayUrl = parsed.hostname.replace(/^www\./i, "")
        } catch {
          displayUrl = url.replace(/^www\./i, "")
        }
        return (
      <a
        className="break-all text-muted-foreground text-xs"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        title={url}
      >
        {displayUrl}
      </a>
        )
      })()
    )}
    {description && (
      <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
    )}
    {children}
  </div>
)

export type InlineCitationQuoteProps = ComponentProps<"blockquote">
export const InlineCitationQuote = ({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) => (
  <blockquote
    className={cn("border-muted border-l-2 pl-3 text-muted-foreground text-sm", className)}
    {...props}
  >
    {children}
  </blockquote>
)
