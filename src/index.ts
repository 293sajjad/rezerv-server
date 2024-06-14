import { Elysia } from "elysia";
import auth from "./plugins/authPlugin";
import staticPlugin from "@elysiajs/static";
import cors from "@elysiajs/cors";
import { logger } from "@bogeychan/elysia-logger";
import rezerv from "./plugins/rezervPlugin";
import room from "./plugins/roomPlugin";

const app = new Elysia()
  .get("/", ({ set }) => "Hello Elysia")
  .use(
    logger({
      level: "error",
    })
  )
  .use(cors())
  .use(staticPlugin())
  .use(auth)
  .use(rezerv)
  .use(room)
  .onError(() => "We have treble")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
