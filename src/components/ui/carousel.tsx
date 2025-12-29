"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type CarouselApi = {
  scrollPrev: () => void
  scrollNext: () => void
  scrollSnapList: () => number[]
  selectedScrollSnap: () => number
  on: (event: "select", cb: () => void) => () => void
}

type CarouselContextValue = {
  selectedIndex: number
  count: number
  setCount: (value: number) => void
  api: CarouselApi
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null)

function useCarouselContext() {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error("Carousel components must be used within <Carousel />")
  }
  return context
}

type CarouselProps = React.ComponentProps<"div"> & {
  setApi?: (api: CarouselApi) => void
}

function Carousel({ className, setApi, ...props }: CarouselProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const listenersRef = React.useRef(new Set<() => void>())

  const api = React.useMemo<CarouselApi>(() => {
    return {
      scrollPrev: () => {
        setSelectedIndex((current) => Math.max(0, current - 1))
      },
      scrollNext: () => {
        setSelectedIndex((current) => Math.min(Math.max(count - 1, 0), current + 1))
      },
      scrollSnapList: () => Array.from({ length: count }, (_, index) => index),
      selectedScrollSnap: () => selectedIndex,
      on: (event, cb) => {
        if (event !== "select") return () => undefined
        listenersRef.current.add(cb)
        return () => listenersRef.current.delete(cb)
      },
    }
  }, [count, selectedIndex])

  React.useEffect(() => {
    listenersRef.current.forEach((listener) => listener())
  }, [selectedIndex])

  React.useEffect(() => {
    if (selectedIndex > count - 1) {
      setSelectedIndex(Math.max(count - 1, 0))
    }
  }, [count, selectedIndex])

  React.useEffect(() => {
    setApi?.(api)
  }, [api, setApi])

  return (
    <CarouselContext.Provider value={{ selectedIndex, count, setCount, api }}>
      <div className={cn("w-full", className)} {...props} />
    </CarouselContext.Provider>
  )
}

type CarouselContentProps = React.ComponentProps<"div">

function CarouselContent({ className, children, ...props }: CarouselContentProps) {
  const { selectedIndex, setCount } = useCarouselContext()
  const items = React.Children.toArray(children)

  React.useEffect(() => {
    setCount(items.length)
  }, [items.length, setCount])

  return (
    <div className={cn("relative w-full", className)} {...props}>
      {React.Children.map(items, (child, index) => {
        if (!React.isValidElement(child)) return child
        const element = child as React.ReactElement<{ className?: string }>
        return React.cloneElement(element, {
          className: cn(
            element.props.className,
            index === selectedIndex ? "block" : "hidden"
          ),
        })
      })}
    </div>
  )
}

type CarouselItemProps = React.ComponentProps<"div">

function CarouselItem({ className, ...props }: CarouselItemProps) {
  return (
    <div className={cn("w-full", className)} {...props} />
  )
}

export { Carousel, CarouselContent, CarouselItem, useCarouselContext }
