import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit mx-auto ", defaultClassNames.root),
        months: cn("flex gap-4 flex-col md:flex-row relative", defaultClassNames.months),
        month: cn("flex flex-col w-full gap-3", defaultClassNames.month),
        nav: cn("flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_next
        ),
        month_caption: cn("flex items-center justify-center h-8 w-full px-8", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        table: "w-full border-collapse",
        weekdays: cn("flex w-full", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center p-2",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-1", defaultClassNames.week),
        day: cn(
          "relative w-full h-full p-0 text-center aspect-square",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn("bg-accent text-accent-foreground rounded-md", defaultClassNames.today),
        outside: cn("text-muted-foreground opacity-50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" {...props} />;
        },
        DayButton: ({ day, modifiers, ...props }) => (
          <button
            {...props}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-8 w-8 p-0 font-normal",
              modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              modifiers.today && "bg-accent text-accent-foreground",
              modifiers.outside && "text-muted-foreground opacity-50",
              modifiers.disabled && "text-muted-foreground opacity-50"
            )}
          >
            {day.date.getDate()}
          </button>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
