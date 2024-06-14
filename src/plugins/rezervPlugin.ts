import cookie from "@elysiajs/cookie";
import { html } from "@elysiajs/html";
import jwt from "@elysiajs/jwt";
import { PrismaClient } from "@prisma/client";
import Elysia, { t } from "elysia";

const prflx = "booking";
const db = new PrismaClient();

const rezerv = new Elysia()
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
    `${prflx}/add`,
    async ({ jwt, cookie: { auth }, body, headers }) => {
      let authToken =
        auth?.value || headers.authorization || headers.Authorization;

      if (!authToken) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "Authentication token not found",
          }),
          { status: 403 }
        );
      }

      const authData = await jwt.verify(authToken);

      if (
        !authData ||
        typeof authData === "boolean" ||
        typeof authData.id !== "number"
      ) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "Invalid authentication data",
          }),
          { status: 403 }
        );
      }

      const roomExist = await db.room.findFirst({
        where: { number: body.roomNumber },
      });
      if (!roomExist) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "No room was found with this ID",
          })
        );
      }

      const today = new Date();
      const bookingDate = new Date(body.date);
      if (bookingDate < today) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "The booking date cannot be in the past",
          })
        );
      }

      // بررسی وجود رزرو در همان تاریخ
      const bookExist = await db.booking.findFirst({
        where: { AND: [{ date: body.date }, { roomId: roomExist.id }] },
      });

      if (bookExist) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "This room is already booked on this date",
          })
        );
      }

      // ایجاد رزرو جدید
      const newBooking = await db.booking.create({
        data: {
          date: body.date,
          userId: authData.id,
          roomId: roomExist.id,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Room booked successfully",
          booking: newBooking,
        })
      );
    },
    {
      beforeHandle: async ({ jwt, cookie: { auth }, headers, set }) => {
        let authToken =
          auth?.value || headers.authorization || headers.Authorization;
        if (!authToken) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "You are not logged in",
            })
          );
        }

        const tokenValidation = await jwt.verify(authToken);
        if (!tokenValidation) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "Invalid authentication token",
            })
          );
        }
      },
      body: t.Object({
        date: t.Date(),
        roomNumber: t.String(),
      }),
    }
  )
  .get(
    `${prflx}/all`,
    async ({ set, jwt, cookie: { auth }, headers }) => {
      let authToken =
        auth?.value || headers.authorization || headers.Authorization;

      if (!authToken) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "Authentication token not found",
          }),
          { status: 403 }
        );
      }

      const authData = await jwt.verify(authToken);

      if (
        !authData ||
        typeof authData === "boolean" ||
        typeof authData.id !== "number"
      ) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "Invalid authentication data",
          }),
          { status: 403 }
        );
      }

      const myBookings = await db.booking.findMany({
        where: { userId: authData.id },
      });

      return new Response(
        JSON.stringify({
          successMessage: "Booking find successfully",
          myBookings,
        })
      );
    },
    {
      beforeHandle: async ({ jwt, cookie: { auth }, headers, set }) => {
        let authToken =
          auth?.value || headers.authorization || headers.Authorization;
        if (!authToken) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "You are not logged in",
            })
          );
        }

        const tokenValidation = await jwt.verify(authToken);
        if (!tokenValidation) {
          set.status = 403;
          return new Response(
            JSON.stringify({
              error: true,
              errorMessage: "Invalid authentication token",
            })
          );
        }
      },
    }
  );

export default rezerv;
