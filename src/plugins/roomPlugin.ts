import { PrismaClient } from "@prisma/client";
import Elysia, { t } from "elysia";

const prflx = "room";
const db = new PrismaClient();

const room = new Elysia()
  .get(`${prflx}/all`, async ({}) => {
    try {
      const rooms = await db.room.findMany();
      return new Response(
        JSON.stringify({
          successMessage: "We get all rooms",
          rooms,
        }),
        { status: 200 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: true,
          errorMessage: "We have error",
        }),
        { status: 500 }
      );
    }
  })
  .post(
    `${prflx}/available-rooms`,
    async ({ body }) => {
      try {
        const { date } = body;
        const bookedRooms = await db.booking.findMany({
          where: {
            date: new Date(date),
          },
          select: {
            roomId: true,
          },
        });

        const bookedRoomIds = bookedRooms.map((booking) => booking.roomId);

        const availableRooms = await db.room.findMany({
          where: {
            id: {
              notIn: bookedRoomIds,
            },
          },
        });

        return new Response(
          JSON.stringify({
            successMessage: "Find rooms be successfully",
            rooms: availableRooms,
          }),
          { status: 200 }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: true,
            errorMessage: "unknown error ",
          }),
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        date: t.Date(),
      }),
    }
  );

export default room;
