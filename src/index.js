const Koa = require("koa");
const Router = require("@koa/router");
const colors = require('colors');
const app = new Koa();
const router = new Router();
const bodyParser = require('koa-bodyparser');
const PORT = 3000;
const { ticketsQueue, createNewTicket } = require("./queues/tickets-queue");
const { createBullBoard } = require('@bull-board/api');



const { KoaAdapter } = require('@bull-board/koa');
const serverAdapter = new KoaAdapter();
serverAdapter.setBasePath("/admin");


const { BullAdapter } = require('@bull-board/api/bullAdapter');
createBullBoard({
  queues: [new BullAdapter(ticketsQueue)],
  serverAdapter,
});


router.get("/health", (ctx) => {
  ctx.body = {
    status: "ok",
    data: "Server is working",
  };
});

router.post("/ticket/book", async (ctx) => {
  console.log(ctx)
  await createNewTicket(ctx.request.body);
  ctx.body = {
    status: "ok",
    data: {
      msg: "Ticket booked successfully!",
      ticket: ctx.request.body,
    },
  };
});

app.use(serverAdapter.registerPlugin());

app.use(bodyParser()).use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`.yellow.bold));