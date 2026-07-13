class AIModerationService:
    """
    Moderation system scanning discussion threads and course reviews for spam, toxicity, or abuse.
    """
    def __init__(self):
        self.toxic_keywords = ['toxic', 'abuse', 'spam', 'scam', 'hack', 'fuck', 'shit', 'idiot']

    def inspect_content(self, text: str) -> dict:
        text_lower = text.lower()
        flagged = False
        reasons = []

        # Simple keyword screening list
        matched_words = [word for word in self.toxic_keywords if word in text_lower]
        if matched_words:
            flagged = True
            reasons.append(f"Contains flagged terminology: {', '.join(matched_words)}")

        # Spam length constraints check
        if len(text) < 4:
            flagged = True
            reasons.append("Content too short (potential spam)")

        return {
            'flagged': flagged,
            'confidence_score': 0.95 if flagged else 0.05,
            'reasons': reasons,
            'moderated_text': text
        }
