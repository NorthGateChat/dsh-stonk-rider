// shadcn/ui New York v4 registry, adapted for the Stonk Rider namespace.
import * as React from "react"
import { cn } from "./cn.ts"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "sr:flex sr:flex-col sr:gap-6 sr:rounded-xl sr:border sr:bg-card sr:py-6 sr:text-card-foreground sr:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "sr:@container/card-header sr:grid sr:auto-rows-min sr:grid-rows-[auto_auto] sr:items-start sr:gap-2 sr:px-6 sr:has-data-[slot=card-action]:grid-cols-[1fr_auto] sr:[.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("sr:leading-none sr:font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("sr:text-sm sr:text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "sr:col-start-2 sr:row-span-2 sr:row-start-1 sr:self-start sr:justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("sr:px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("sr:flex sr:items-center sr:px-6 sr:[.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
