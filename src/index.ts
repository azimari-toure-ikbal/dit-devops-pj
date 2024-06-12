import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./db";
import { users } from "./db/schema";

const app = new Hono();

app.use("/", cors());
app.onError((err, c) => {
  return c.json({ error: err.message });
});

app.get("/", async (c) => {
  const res = await db.select().from(users);

  return c.json(res);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
