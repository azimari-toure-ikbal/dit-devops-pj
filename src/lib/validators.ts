import { z } from "zod";

export const newLinkSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
});
