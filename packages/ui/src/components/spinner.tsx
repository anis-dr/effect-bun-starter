import { Loader2Icon } from "lucide-react";

import { cn } from "#lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"output">) {
  return (
    <output
      data-slot="spinner"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    >
      <Loader2Icon aria-hidden="true" className="size-full" />
    </output>
  );
}

export { Spinner };
