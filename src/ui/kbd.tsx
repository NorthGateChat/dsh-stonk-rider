// shadcn/ui New York v4 registry, adapted for the Stonk Rider namespace.
import { cn } from "./cn.ts"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "sr:pointer-events-none sr:inline-flex sr:h-5 sr:w-fit sr:min-w-5 sr:items-center sr:justify-center sr:gap-1 sr:rounded-sm sr:bg-muted sr:px-1 sr:font-sans sr:text-xs sr:font-medium sr:text-muted-foreground sr:select-none",
        "sr:[&_svg:not([class*='size-'])]:size-3",
        "sr:[[data-slot=tooltip-content]_&]:bg-background/20 sr:[[data-slot=tooltip-content]_&]:text-background sr:dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("sr:inline-flex sr:items-center sr:gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
