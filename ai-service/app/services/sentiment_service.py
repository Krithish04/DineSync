# Algorithm: Pretrained DistilBERT sentiment classifier via HuggingFace transformers pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english').
# Fallback Condition: If feedback_text is empty or transformers pipeline fails to initialize/infer,
# the service falls back to numerical rating-based sentiment classification (rating >= 4.0 -> Positive, <= 2.0 -> Negative, else Neutral).
# Fabricated fake themes are completely removed (key_themes = []).

import logging
from typing import List, Optional
from app.models.sentiment import SentimentAnalysisRequest, SentimentAnalysisResponse

logger = logging.getLogger(__name__)

_sentiment_pipeline = None


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        try:
            from transformers import pipeline
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                truncation=True,
                max_length=512,
            )
        except Exception as e:
            logger.warning(f"Could not load HuggingFace DistilBERT pipeline: {e}. Using rating fallbacks.")
            _sentiment_pipeline = False
    return _sentiment_pipeline


def calculate_sentiment_analysis(req: SentimentAnalysisRequest) -> SentimentAnalysisResponse:
    pos_count = 0
    neu_count = 0
    neg_count = 0

    pipeline_obj = get_sentiment_pipeline()

    if req.feedbacks:
        for f in req.feedbacks:
            text = (f.feedback_text or "").strip()
            rating = f.rating if f.rating is not None else 5.0

            # Attempt DistilBERT inference on valid text
            classified = False
            if text and pipeline_obj:
                try:
                    res = pipeline_obj(text[:512])[0]
                    label = res.get("label", "").upper()
                    score = res.get("score", 0.0)

                    if label == "POSITIVE" and score >= 0.55:
                        pos_count += 1
                        classified = True
                    elif label == "NEGATIVE" and score >= 0.55:
                        neg_count += 1
                        classified = True
                except Exception as err:
                    logger.debug(f"DistilBERT inference error for text: {err}")

            if not classified:
                # Rating-based fallback
                if rating >= 4.0:
                    pos_count += 1
                elif rating <= 2.0:
                    neg_count += 1
                else:
                    neu_count += 1
    else:
        # Default baseline
        pos_count = 1
        neu_count = 0
        neg_count = 0

    total = pos_count + neu_count + neg_count
    pos_pct = round((pos_count / total * 100), 1) if total > 0 else 100.0
    score = round((pos_count * 10.0 + neu_count * 5.0) / total, 1) if total > 0 else 10.0

    if score >= 7.5:
        overall = "Positive"
    elif score >= 5.0:
        overall = "Neutral"
    else:
        overall = "Negative"

    return SentimentAnalysisResponse(
        overall_sentiment=overall,
        sentiment_score=score,
        positive_count=pos_count,
        neutral_count=neu_count,
        negative_count=neg_count,
        positive_percentage=pos_pct,
        key_themes=[],  # Fabricated themes removed per specification
    )
