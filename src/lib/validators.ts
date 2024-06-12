import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email(),
});

export const verifySchema = z.object({
  email: z.string().email(),
  code: z.string(),
});

export const tokenSchema = z.object({
  token: z.string(),
});

// newLinkSchema is of type NewLink
export const newLinkSchema = z.object({
  email: z.string().email(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
});
