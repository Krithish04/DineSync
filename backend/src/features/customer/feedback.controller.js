const Feedback = require('./feedback.model');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

/**
 * List feedback with filter options OR return aggregate stats if aggregate=true
 */
const getFeedback = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { rating, resolved, aggregate, page = 1, limit = 20 } = req.query;

  if (aggregate === 'true') {
    const allFeedback = await Feedback.find({ restaurant: restaurantId });

    const totalFeedback = allFeedback.length;
    const totalRatingSum = allFeedback.reduce((acc, f) => acc + (f.rating || 0), 0);
    const averageRating = totalFeedback > 0 ? Number((totalRatingSum / totalFeedback).toFixed(1)) : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sentimentBreakdown = { Positive: 0, Neutral: 0, Negative: 0 };

    let foodSum = 0, serviceSum = 0, staffSum = 0;

    allFeedback.forEach((f) => {
      if (f.rating >= 1 && f.rating <= 5) ratingDistribution[f.rating] += 1;
      if (f.sentiment && sentimentBreakdown[f.sentiment] !== undefined) {
        sentimentBreakdown[f.sentiment] += 1;
      }
      foodSum += f.foodRating || f.rating || 5;
      serviceSum += f.serviceRating || f.rating || 5;
      staffSum += f.staffRating || f.rating || 5;
    });

    const averageFoodRating = totalFeedback > 0 ? Number((foodSum / totalFeedback).toFixed(1)) : 0;
    const averageServiceRating = totalFeedback > 0 ? Number((serviceSum / totalFeedback).toFixed(1)) : 0;
    const averageStaffRating = totalFeedback > 0 ? Number((staffSum / totalFeedback).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      message: 'Feedback aggregate statistics retrieved successfully.',
      data: {
        totalFeedback,
        averageRating,
        ratingDistribution,
        sentimentBreakdown,
        averageFoodRating,
        averageServiceRating,
        averageStaffRating,
      },
    });
  }

  // Actionable List View
  const filter = { restaurant: restaurantId };
  if (rating) filter.rating = Number(rating);
  if (resolved !== undefined) filter.resolved = resolved === 'true';

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('order', 'orderNumber orderType grandTotal'),
    Feedback.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Feedback list retrieved successfully.',
    data: {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    },
  });
});

/**
 * Respond to feedback / mark resolved
 */
const respondToFeedback = asyncHandler(async (req, res) => {
  const { restaurantId, feedbackId } = req.params;
  const { managerResponse, resolved } = req.body;

  const feedback = await Feedback.findOne({ _id: feedbackId, restaurant: restaurantId });
  if (!feedback) {
    throw ApiError.notFound('Feedback entry not found.');
  }

  if (managerResponse !== undefined) {
    feedback.managerResponse = managerResponse;
  }
  if (resolved !== undefined) {
    feedback.resolved = Boolean(resolved);
  }

  await feedback.save();

  return res.status(200).json({
    success: true,
    message: 'Feedback response updated successfully.',
    data: feedback,
  });
});

module.exports = {
  getFeedback,
  respondToFeedback,
};
