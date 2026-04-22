"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex min-h-9 w-full items-center justify-between rounded-md border border-slate-700 bg-[#0b1220] px-3 py-2 text-sm text-white shadow-sm ring-offset-background data-[placeholder]:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#37F2D1] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-2 [&>span]:text-left",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-slate-300", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-slate-300", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-md border border-slate-700 bg-[#1E2430] text-white shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/**
 * SelectItem with a two-line layout when `description` is supplied:
 * bold label on the first line, muted description wrapped below. Plain
 * usage (no description prop) renders identically to the previous API
 * aside from the tighter padding pass. The `line-clamp-none` override
 * lets long option labels wrap instead of getting cut off, which was
 * the complaint on the Bard College / Warlock Pact pickers.
 */
const SelectItem = React.forwardRef(({ className, children, description, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-start rounded-sm py-2 pl-3 pr-8 text-sm text-white outline-none focus:bg-[#37F2D1]/10 focus:text-white data-[state=checked]:bg-[#37F2D1]/15 data-[state=checked]:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>span]:line-clamp-none",
      className
    )}
    {...props}>
    <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center text-[#37F2D1]">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>
      {description ? (
        <span className="flex flex-col gap-0.5 pr-2">
          <span className="font-bold leading-tight">{children}</span>
          <span className="text-[11px] text-slate-400 leading-snug whitespace-normal break-words">
            {description}
          </span>
        </span>
      ) : (
        <span className="whitespace-normal break-words leading-snug">{children}</span>
      )}
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-700/70", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
