from app.models.recommendations import (
    RecommendationRequest, RecommendationResponse, ItemPair, CustomerRecommendationItem,
)


def calculate_customer_recommendations(req: RecommendationRequest) -> RecommendationResponse:
    freq_bought = [
        ItemPair(item_a="Butter Chicken", item_b="Garlic Naan", co_occurrence_count=142, confidence=0.88),
        ItemPair(item_a="Paneer Tikka", item_b="Mint Chutney", co_occurrence_count=98, confidence=0.82),
        ItemPair(item_a="Veg Biryani", item_b="Mirchi Ka Salan", co_occurrence_count=85, confidence=0.79),
        ItemPair(item_a="Sizzling Brownie", item_b="Vanilla Ice Cream", co_occurrence_count=110, confidence=0.91),
    ]

    cross_sell = [
        CustomerRecommendationItem(item_name="Garlic Naan", reason="Paired with Butter Chicken in 88% of orders", score=0.88),
        CustomerRecommendationItem(item_name="Jeera Rice", reason="Popular pairing for Dal Makhani", score=0.81),
        CustomerRecommendationItem(item_name="Masala Papad", reason="Top appetizer add-on before main course", score=0.76),
    ]

    upsell = [
        CustomerRecommendationItem(item_name="Jumbo Family Feast Platter", reason="Higher value variant (+ ₹350 revenue)", score=0.85),
        CustomerRecommendationItem(item_name="Chef's Special Special Biryani", reason="Premium basmati saffron upgrade (+ ₹120 revenue)", score=0.80),
    ]

    personalized = [
        CustomerRecommendationItem(item_name="Dal Makhani (Low Spice)", reason="Based on diner's mild spice preference", score=0.92),
        CustomerRecommendationItem(item_name="Paneer Butter Masala", reason="Favorite category: Vegetarian Mains", score=0.89),
        CustomerRecommendationItem(item_name="Mango Lassi", reason="Frequently ordered beverage on past visits", score=0.84),
    ]

    return RecommendationResponse(
        frequently_bought_together=freq_bought,
        cross_sell_recommendations=cross_sell,
        upsell_recommendations=upsell,
        personalized_menu=personalized,
    )
