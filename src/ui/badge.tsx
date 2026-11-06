// shadcn/ui New York v4 registry, adapted for the Stonk Rider namespace.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn.ts"
import * as Slot from "@radix-ui/react-slot"

const badgeVariants = cva(
  "sr:inline-flex sr:w-fit sr:shrink-0 sr:items-center sr:justify-center sr:gap-1 sr:overflow-hidden sr:rounded-full sr:border sr:border-transparent sr:px-2 sr:py-0.5 sr:text-xs sr:font-medium sr:whitespace-nowrap sr:transition-[color,box-shadow] sr:focus-visible:border-ring sr:focus-visible:ring-[3px] sr:focus-visible:ring-ring/50 sr:aria-invalid:border-destructive sr:aria-invalid:ring-destructive/20 sr:dark:aria-invalid:ring-destructive/40 sr:[&>svg]:pointer-events-none sr:[&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "sr:bg-primary sr:text-primary-foreground sr:[a&]:hover:bg-primary/90",
        secondary:
          "sr:bg-secondary sr:text-secondary-foreground sr:[a&]:hover:bg-secondary/90",
        destructive:
          "sr:bg-destructive sr:text-white sr:focus-visible:ring-destructive/20 sr:dark:bg-destructive/60 sr:dark:focus-visible:ring-destructive/40 sr:[a&]:hover:bg-destructive/90",
        outline:
          "sr:border-border sr:text-foreground sr:[a&]:hover:bg-accent sr:[a&]:hover:text-accent-foreground",
        ghost: "sr:[a&]:hover:bg-accent sr:[a&]:hover:text-accent-foreground",
        link: "sr:text-primary sr:underline-offset-4 sr:[a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
