import { ReactNode } from "react";

/**
 * Corner-bracket frame, like a camera viewfinder capturing evidence.
 * Wraps listing photos to signal "this was actually inspected on site"
 * rather than just uploaded by the landlord.
 */
export function BracketFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative p-3">
      <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-verified" />
      <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-verified" />
      <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-verified" />
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-verified" />
      {children}
    </div>
  );
}
