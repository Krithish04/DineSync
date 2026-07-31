const { z } = require('zod');

const updateTicketStatusSchema = z.object({
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Served', 'Delayed']),
});

const updateTicketItemStatusSchema = z.object({
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Served', 'Delayed']),
});

module.exports = {
  updateTicketStatusSchema,
  updateTicketItemStatusSchema,
};
