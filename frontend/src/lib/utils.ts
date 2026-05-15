import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The standard shadcn/ui utility for combining Tailwind classes.
 * clsx handles conditionals; twMerge resolves conflicts (e.g. "p-2 p-4" → "p-4").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
