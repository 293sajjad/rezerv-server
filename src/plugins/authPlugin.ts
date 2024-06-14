import { PrismaClient } from "@prisma/client";
import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import cookie from "@elysiajs/cookie";
import { html } from "@elysiajs/html";

const prflx = "auth";
const db = new PrismaClient();

const auth = new Elysia()
  .use(
    jwt({
      name: "jwt",
      // This should be Environment Variable
      secret:
        Bun.env.MY_SECRETS ||
        "63ca4bad8f9c8f5776d45be21fff27c7cb48e98d6016ae1635f86de8ad815324",
    })
  )
  .use(cookie())
  .use(html())
  .post(
    `${prflx}/register`,
    async ({ body, cookie: { auth }, jwt }) => {
      const userExist = await db.user.findFirst({
        where: { email: body.email },
      });
      if (!userExist) {
        try {
          const hash = await Bun.password.hash(body.password);
          const user = await db.user.create({
            data: {
              name: body.name,
              email: body.email,
              password: hash,
            },
          });

          const { id, email } = user;
          const Payload = { id, email };
          auth.set({
            value: await jwt.sign(Payload),
            httpOnly: true,
            maxAge: 7 * 86400,
          });

          return new Response(
            JSON.stringify({
              successMessage: "User registered successfully",
              user,
              token: auth.value,
            }),
            { status: 201 }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: error.message,
            }),
            { status: 500 }
          );
        }
      }

      return new Response(
        JSON.stringify({
          error: true,
          errorMessage: "User with this email already exist!",
        }),
        { status: 400 }
      );
    },
    {
      beforeHandle: async ({ jwt, set, cookie: { auth } }) => {
        const tokenValidation = await jwt.verify(auth.value);
        if (tokenValidation) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "You are already logged in",
            })
          );
        }
      },
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post(
    `${prflx}/login`,
    async ({ jwt, body, cookie: { auth } }) => {
      const { email, password } = body;
      const user = await db.user.findFirst({ where: { email } });
      if (!user) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "User information is not correct1",
          }),
          { status: 401 }
        );
      }
      const userCheckPass = await Bun.password.verify(password, user.password);
      if (!userCheckPass) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "User information is not correct2",
          }),
          { status: 401 }
        );
      }
      const { id } = user;
      const Payload = { id, email };
      auth.set({
        value: await jwt.sign(Payload),
        httpOnly: true,
        maxAge: 7 * 86400,
      });

      return new Response(
        JSON.stringify({
          successMessage: "User login successfully",
          user,
          token: auth.value,
        }),
        { status: 201 }
      );
    },
    {
      beforeHandle: async ({ jwt, set, cookie: { auth } }) => {
        const tokenValidation = await jwt.verify(auth.value);
        if (tokenValidation) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "You are already logged in",
            })
          );
        }
      },
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .post(`${prflx}/logout`, async ({ cookie: { auth } }) => {
    if (auth.value) {
      await auth.remove();

      return new Response(
        JSON.stringify({
          successMessage: "logout successful",
        }),
        { status: 201 }
      );
    }

    return new Response(
      JSON.stringify({
        error: true,
        errorMessage: "You are not logged in yet",
      }),
      { status: 401 }
    );
  });

export default auth;
