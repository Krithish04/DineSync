const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const categoryService = require('./category.service');

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.params.restaurantId, req.body);
  return new ApiResponse(201, { category }, 'Category created successfully').send(res);
});

const listCategories = asyncHandler(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const search = req.query.search || '';
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

  const result = await categoryService.listCategories(req.params.restaurantId, {
    page,
    limit,
    search,
    isActive,
  });

  return new ApiResponse(200, result, 'Categories fetched successfully').send(res);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategory(req.params.restaurantId, req.params.categoryId);
  return new ApiResponse(200, { category }, 'Category fetched successfully').send(res);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.restaurantId,
    req.params.categoryId,
    req.body
  );
  return new ApiResponse(200, { category }, 'Category updated successfully').send(res);
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.restaurantId, req.params.categoryId);
  return new ApiResponse(200, null, 'Category deleted successfully').send(res);
});

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
