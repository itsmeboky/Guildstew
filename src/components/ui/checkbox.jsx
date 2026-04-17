import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// Explicit colour defaults so the box is visible on both the light
// login card and the dark app surfaces without callers having to
// remember to re-style on every site. Override via `className`.
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border-2 border-slate-500 bg-white/80 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#37F2D1] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#37F2D1] data-[state=checked]:border-[#37F2D1] data-[state=checked]:text-[#050816]",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
