const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const kitchenService = require('./kitchen.service');

const listTickets = asyncHandler(async (req, res) => {
  const station = req.query.station || undefined;
  const status = req.query.status || undefined;
  const priority = req.query.priority || undefined;
  const search = req.query.search || '';

  const tickets = await kitchenService.listTickets(req.params.restaurantId, {
    station,
    status,
    priority,
    search,
  });

  return new ApiResponse(200, { tickets }, 'Kitchen tickets fetched successfully').send(res);
});

const updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await kitchenService.updateTicketStatus(
    req.params.restaurantId,
    req.params.ticketId,
    req.body.status
  );
  return new ApiResponse(200, { ticket }, 'Ticket status updated successfully').send(res);
});

const updateTicketItemStatus = asyncHandler(async (req, res) => {
  const ticket = await kitchenService.updateTicketItemStatus(
    req.params.restaurantId,
    req.params.ticketId,
    req.params.itemId,
    req.body.status
  );
  return new ApiResponse(200, { ticket }, 'Ticket item status updated successfully').send(res);
});

const getKitchenStats = asyncHandler(async (req, res) => {
  const stats = await kitchenService.getKitchenStats(req.params.restaurantId);
  return new ApiResponse(200, { stats }, 'Kitchen stats fetched successfully').send(res);
});

module.exports = {
  listTickets,
  updateTicketStatus,
  updateTicketItemStatus,
  getKitchenStats,
};
