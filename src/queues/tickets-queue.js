const Queue = require("bull");
const { ticketsProcess } = require("./tickets-queue-consumer");

// Our job queue
const ticketsQueue = new Queue("tickets", {
  redis: 'http://127.0.0.1:6379/',
});

ticketsQueue.process(ticketsProcess);

const createNewTicket = (ticket) => {
  ticketsQueue.add(ticket, {
    priority: getJobPriority(ticket),
    attempts: 2,
    // delay: getJobDelay(ticket), // Option to delay jobs
    repeat: getJobRepeatOptions(ticket), // Option to add repeating jobs
  });
};


const getJobRepeatOptions = (ticket) => {
  return {
    every: 2 * 24 * 60 * 60 * 1000, 
    endDate: new Date("2023-12-31"), 
  };
};

const getJobPriority = (ticket) => {
  if (!ticket.price) return 3;
  return ticket > 100 ? 1 : 2;
};


const getJobDelay = (ticket) => {
  // Calculate the delay time for the job
  // Example: Delay the job by 1 hour
  return 60 * 60 * 1000; // 1 hour in milliseconds
};



module.exports = {
  ticketsQueue,
  createNewTicket,
};

