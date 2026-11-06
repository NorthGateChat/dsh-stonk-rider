// shadcn/ui New York v4 registry, adapted for the Stonk Rider namespace.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn.ts"
import * as Slot from "@radix-ui/react-slot"

const buttonVariants = cva(
  "sr:inline-flex sr:shrink-0 sr:items-center sr:justify-center sr:gap-2 sr:rounded-md sr:text-sm sr:font-medium sr:whitespace-nowrap sr:transition-all sr:outline-none sr:focus-visible:border-ring sr:focus-visible:ring-[3px] sr:focus-visible:ring-ring/50 sr:disabled:pointer-events-none sr:disabled:opacity-50 sr:aria-invalid:border-destructive sr:aria-invalid:ring-destructive/20 sr:dark:aria-invalid:ring-destructive/40 sr:[&_svg]:pointer-events-none sr:[&_svg]:shrink-0 sr:[&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "sr:bg-primary sr:text-primary-foreground sr:hover:bg-primary/90",
        destructive:
          "sr:bg-destructive sr:text-white sr:hover:bg-destructive/90 sr:focus-visible:ring-destructive/20 sr:dark:bg-destructive/60 sr:dark:focus-visible:ring-destructive/40",
        outline:
          "sr:border sr:bg-background sr:shadow-xs sr:hover:bg-accent sr:hover:text-accent-foreground sr:dark:border-input sr:dark:bg-input/30 sr:dark:hover:bg-input/50",
        secondary:
          "sr:bg-secondary sr:text-secondary-foreground sr:hover:bg-secondary/80",
        ghost:
          "sr:hover:bg-accent sr:hover:text-accent-foreground sr:dark:hover:bg-accent/50",
        link: "sr:text-primary sr:underline-offset-4 sr:hover:underline",
      },
      size: {
        default: "sr:h-9 sr:px-4 sr:py-2 sr:has-[>svg]:px-3",
        xs: "sr:h-6 sr:gap-1 sr:rounded-md sr:px-2 sr:text-xs sr:has-[>svg]:px-1.5 sr:[&_svg:not([class*='size-'])]:size-3",
        sm: "sr:h-8 sr:gap-1.5 sr:rounded-md sr:px-3 sr:has-[>svg]:px-2.5",
        lg: "sr:h-10 sr:rounded-md sr:px-6 sr:has-[>svg]:px-4",
        icon: "sr:size-9",
        "icon-xs": "sr:size-6 sr:rounded-md sr:[&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "sr:size-8",
        "icon-lg": "sr:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
