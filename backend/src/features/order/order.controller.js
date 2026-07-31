const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const orderService = require('./order.service');

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.params.restaurantId, req.body, req.user?._id);
  return new ApiResponse(201, { order }, 'Order created successfully').send(res);
});

const listOrders = asyncHandler(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const search = req.query.search || '';
  const branch = req.query.branch || undefined;
  const orderStatus = req.query.orderStatus || undefined;
  const paymentStatus = req.query.paymentStatus || undefined;
  const orderType = req.query.orderType || undefined;

  const result = await orderService.listOrders(req.params.restaurantId, {
    page,
    limit,
    branch,
    orderStatus,
    paymentStatus,
    orderType,
    search,
  });

  return new ApiResponse(200, result, 'Orders fetched successfully').send(res);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.restaurantId, req.params.orderId);
  return new ApiResponse(200, { order }, 'Order fetched successfully').send(res);
});

const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.params.restaurantId, req.params.orderId, req.body);
  return new ApiResponse(200, { order }, 'Order updated successfully').send(res);
});

const deleteOrder = asyncHandler(async (req, res) => {
  await orderService.deleteOrder(req.params.restaurantId, req.params.orderId);
  return new ApiResponse(200, null, 'Order deleted successfully').send(res);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.restaurantId,
    req.params.orderId,
    req.body.status
  );
  return new ApiResponse(200, { order }, 'Order status updated successfully').send(res);
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(
    req.params.restaurantId,
    req.params.orderId,
    req.body.status,
    req.body.redeemPoints ? parseInt(req.body.redeemPoints, 10) : 0
  );
  return new ApiResponse(200, { order }, 'Payment status updated successfully').send(res);
});

const splitBill = asyncHandler(async (req, res) => {
  const result = await orderService.splitBill(
    req.params.restaurantId,
    req.params.orderId,
    req.body
  );
  return new ApiResponse(200, result, 'Bill split processed successfully').send(res);
});

const mergeOrders = asyncHandler(async (req, res) => {
  const { targetOrderId, sourceOrderIds } = req.body;
  const order = await orderService.mergeOrders(
    req.params.restaurantId,
    targetOrderId,
    sourceOrderIds
  );
  return new ApiResponse(200, { order }, 'Orders merged successfully').send(res);
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  splitBill,
  mergeOrders,
};
