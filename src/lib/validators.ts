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

export const newLinkSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
});
