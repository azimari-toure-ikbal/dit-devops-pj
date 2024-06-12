import { zValidator } from "@hono/zod-validator";
import { addHours } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from "hono/cookie";
import { cors } from "hono/cors";
import { db } from "./db";
import { links, tokens, users } from "./db/schema";
import {
  genApiKey,
  genRandomCode,
  genRandUrlKey,
  sendVerificationEmail,
} from "./lib/utils";
import { authSchema, newLinkSchema, verifySchema } from "./lib/validators";

const PORT = 3000;

const app = new Hono();

if (!process.env.DEV_ENV) throw new Error("DEV_ENV is not set");

app.use("/", cors());
app.onError((err, c) => {
  return c.json({ error: err.message });
});

app.post("/login", zValidator("json", authSchema), async (c) => {
  const { email } = c.req.valid("json");

  const res = await db.select().from(users).where(eq(users.email, email));

  if (res.length === 0) {
    throw new Error("User not found");
  }

  const user = res[0];

  if (user.code) {
    throw new Error("User is already verified");
  }

  const code = genRandomCode();

  await db
    .update(users)
    .set({ code, updatedAt: new Date() })
    .where(eq(users.email, email));

  await sendVerificationEmail(email, code);

  return c.json({ success: true });
});

app.post("/signup", zValidator("json", authSchema), async (c) => {
  const { email } = c.req.valid("json");

  const code = genRandomCode();

  await sendVerificationEmail(email, code);

  const res = await db.select().from(users).where(eq(users.email, email));

  if (res.length === 0) {
    await db.insert(users).values({
      email,
      code,
    });
  }

  await db
    .update(users)
    .set({
      code,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email));

  return c.json({ sucess: true });
});

app.post("/verify", zValidator("json", verifySchema), async (c) => {
  const { email, code } = c.req.valid("json");

  const res = await db.select().from(users).where(eq(users.email, email));

  if (res.length === 0) {
    throw new Error("User not found");
  }

  const user = res[0];

  if (user.code !== code) {
    throw new Error("Invalid validation code");
  }

  await db
    .update(users)
    .set({ code: null, updatedAt: new Date() })
    .where(eq(users.email, email));

  // Set a cookie to authenticate the user
  setCookie(c, "auth", "true", {
    path: "/",
    secure: true,
    domain: process.env.DEV_ENV === "true" ? "localhost" : "example.com",
    httpOnly: true,
    maxAge: 1000,
    expires: addHours(new Date(), 5),
    sameSite: "Strict",
  });

  return c.json({ success: true });
});

app.post("/logout", zValidator("json", authSchema), async (c) => {
  const { email } = c.req.valid("json");

  await db
    .update(users)
    .set({ code: null, updatedAt: new Date() })
    .where(eq(users.email, email));

  deleteCookie(c, "auth");
  deleteCookie(c, "token");
  return c.json({ success: true });
});

//* Token
app.post("/tokens/token", zValidator("json", authSchema), async (c) => {
  if (!process.env.COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET is not set");
  }

  const auth = getCookie(c, "auth");

  if (!auth || auth !== "true") {
    await db.update(users).set({ code: null, updatedAt: new Date() });
    throw new Error("Not authenticated");
  }

  const { email } = c.req.valid("json");

  const res = await db.select().from(users).where(eq(users.email, email));

  if (res.length === 0) {
    throw new Error("User not found");
  }

  const user = res[0];

  // Check if the user already has a token
  const tokenExists = await db
    .select()
    .from(tokens)
    .where(eq(tokens.userId, user.id));

  if (tokenExists.length > 0) {
    throw new Error("User already has a token");
  }

  const token = genApiKey();

  await db.insert(tokens).values({
    userId: user.id,
    tokenVal: token,
  });

  await setSignedCookie(c, "token", token, process.env.COOKIE_SECRET, {
    path: "/",
    secure: true,
    domain: process.env.DEV_ENV === "true" ? "localhost" : "example.com",
    httpOnly: true,
    maxAge: 1000,
    expires: addHours(new Date(), 5),
    sameSite: "Strict",
  });
  return c.json({ token });
});

app.delete("/tokens/token", async (c) => {
  const auth = getCookie(c, "auth");
  const token = await getSignedCookie(c, process.env.COOKIE_SECRET!, "token");

  if (!auth || auth !== "true") {
    await db.update(users).set({ code: null, updatedAt: new Date() });
    throw new Error("Not authenticated");
  }

  if (!token) {
    throw new Error("No token found");
  }

  await db.delete(tokens).where(eq(tokens.tokenVal, token));

  return c.json({ success: true });
});

//* Links
app.post("/links/link", zValidator("json", newLinkSchema), async (c) => {
  const auth = getCookie(c, "auth");
  const token = await getSignedCookie(c, process.env.COOKIE_SECRET!, "token");

  if (!auth || auth !== "true") {
    await db.update(users).set({ code: null, updatedAt: new Date() });
    throw new Error("Not authenticated");
  }

  if (!token) {
    throw new Error("No token found");
  }

  const { email, title, url, description } = c.req.valid("json");

  // Get user
  const resUsers = await db.select().from(users).where(eq(users.email, email));

  if (resUsers.length === 0) {
    throw new Error("User not found");
  }

  const user = resUsers[0];

  // Check if the user has a link to the same url
  const resLinks = await db.select().from(links).where(eq(links.original, url));

  if (resLinks.length > 0) {
    throw new Error("Link already exists");
  }

  const short = genRandUrlKey();

  await db.insert(links).values({
    userId: user.id,
    original: url,
    title,
    shortened: short,
  });

  return c.json({
    shortened: short,
  });
});

app.get("/links/:short", async (c) => {
  const short = c.req.param("short");

  const res = await db.select().from(links).where(eq(links.shortened, short));

  if (res.length === 0) {
    throw new Error("Link not found");
  }

  await db.update(links).set({
    clicks: sql`${links.clicks} + 1`,
    updatedAt: new Date(),
  });

  return c.redirect(res[0].original);
});

app.get("/", async (c) => {
  const res = getCookie(c, "auth");

  const key = genApiKey();

  const signed = await getSignedCookie(c, process.env.COOKIE_SECRET!, "token");

  return c.json({
    key,
    res,
    signed,
  });
});

export default {
  port: PORT,
  fetch: app.fetch,
};
