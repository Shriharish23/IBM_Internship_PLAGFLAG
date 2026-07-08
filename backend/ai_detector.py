import os
import re
import math
from dotenv import load_dotenv

load_dotenv()


class AIDetector:
    """
    Detect AI-generated content.
    Primary: IBM Granite via watsonx.ai
    Fallback: Enhanced multi-signal heuristic analyzer
    """

    IBM_API_KEY = os.getenv("IBM_API_KEY", "")
    IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID", "")
    IBM_URL = os.getenv("IBM_URL", "https://us-south.ml.cloud.ibm.com")
    GRANITE_MODEL = "ibm/granite-13b-instruct-v2"

    SYSTEM_PROMPT = (
        "You are an expert AI content detector. Analyze the provided text and determine "
        "if it was written by an AI language model (ChatGPT, Claude, Gemini, Copilot, etc.) "
        "or by a human.\n\n"
        "Key AI writing signals to look for:\n"
        "1. Numbered/bulleted structured sections like '1. X Definition..., 2. Key Features...'\n"
        "2. Formal encyclopedia-style definition openings: 'X is a/an extension/tool/method...'\n"
        "3. Repetitive transitional phrases: Furthermore, Moreover, Additionally, In conclusion\n"
        "4. Perfect paragraph balance and uniform sentence length\n"
        "5. No contractions, no personal voice, no typos\n"
        "6. Over-explained obvious concepts with excessive hedging\n"
        "7. Generic 'Key Features', 'Applications', 'Advantages', 'Disadvantages' section headers\n\n"
        "Respond ONLY in JSON:\n"
        '{"is_ai": true/false, "confidence": 0.0-1.0, '
        '"reasoning": "brief explanation max 80 words", '
        '"indicators": ["list", "of", "detected", "indicators"]}'
    )

    def __init__(self):
        self._client = None
        self._use_granite = bool(self.IBM_API_KEY and self.IBM_PROJECT_ID)

    def _get_client(self):
        if self._client is None and self._use_granite:
            try:
                from ibm_watsonx_ai import APIClient, Credentials
                credentials = Credentials(url=self.IBM_URL, api_key=self.IBM_API_KEY)
                self._client = APIClient(credentials)
            except Exception:
                self._use_granite = False
        return self._client

    def _detect_with_granite(self, text: str) -> dict:
        """Use IBM Granite via watsonx.ai."""
        try:
            from ibm_watsonx_ai.foundation_models import ModelInference
            from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
            import json

            client = self._get_client()
            if not client:
                return self._local_detect(text)

            model = ModelInference(
                model_id=self.GRANITE_MODEL,
                api_client=client,
                project_id=self.IBM_PROJECT_ID,
                params={
                    GenParams.MAX_NEW_TOKENS: 300,
                    GenParams.MIN_NEW_TOKENS: 50,
                    GenParams.TEMPERATURE: 0.1,
                    GenParams.TOP_P: 0.95,
                    GenParams.STOP_SEQUENCES: ["\n\n"],
                }
            )

            prompt = (
                f"{self.SYSTEM_PROMPT}\n\n"
                f"Text to analyze:\n{text[:2500]}\n\nAnalysis:"
            )
            response = model.generate_text(prompt=prompt)

            json_match = re.search(r'\{.*?\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "is_ai": bool(result.get("is_ai", False)),
                    "confidence": float(result.get("confidence", 0.5)),
                    "reasoning": result.get("reasoning", "IBM Granite analysis complete."),
                    "indicators": result.get("indicators", []),
                    "model": "IBM Granite 13B (watsonx.ai)",
                }
        except Exception:
            pass
        return self._local_detect(text)

    def _local_detect(self, text: str) -> dict:
        """
        Enhanced multi-signal heuristic AI detector.
        Tuned to catch AI-generated educational/technical documents.
        """
        indicators = []
        score = 0.0
        word_count = len(text.split())

        # ── Signal 1: Structural AI template patterns ──────────────────
        # "X is a/an [definition]..." — classic AI opening
        if re.search(
            r'^[A-Z][^.]{0,60}\s+is\s+(a|an|the)\s+\w+',
            text.strip(), re.IGNORECASE
        ):
            score += 0.18
            indicators.append("AI-style definition opening sentence")

        # Numbered sections like "1. Introduction", "2. Key Features", etc.
        # Matches both line-start and inline patterns (PDF extraction merges lines)
        numbered_sections = re.findall(
            r'(?:^|[\n\s])(\d+[\.\)]\s+[A-Z][a-zA-Z\s]{3,50})(?:\n|\.|\s{2}|$)',
            text
        )
        if len(numbered_sections) >= 3:
            score += 0.22
            indicators.append(
                f"Structured numbered sections ({len(numbered_sections)} found) — typical AI document format"
            )
        elif len(numbered_sections) >= 2:
            score += 0.12

        # Generic AI section headers
        ai_headers = [
            r'\bkey\s+features?\b', r'\badvantages?\b', r'\bdisadvantages?\b',
            r'\bapplications?\b', r'\boverview\b', r'\bintroduction\b',
            r'\bconclusion\b', r'\bsummary\b', r'\bbenefits?\b',
            r'\buse\s+cases?\b', r'\bhow\s+it\s+works\b', r'\bexample[s]?\b',
            r'\btypes?\s+of\b', r'\bcharacteristics?\b', r'\bcomponents?\b',
        ]
        header_count = sum(
            1 for h in ai_headers
            if re.search(h, text, re.IGNORECASE)
        )
        if header_count >= 6:
            score += 0.18
            indicators.append(
                f"Multiple generic AI section headers ({header_count} found)"
            )
        elif header_count >= 4:
            score += 0.10

        # ── Signal 2: AI transitional phrases ──────────────────────────
        ai_phrases = [
            r'\bfurthermore\b', r'\bmoreover\b', r'\badditionally\b',
            r'\bin conclusion\b', r'\bin summary\b', r'\bto summarize\b',
            r'\bit is worth noting\b', r'\bit is important to note\b',
            r'\bin this context\b', r'\bthis highlights\b',
            r'\bas mentioned\b', r'\bfrom this perspective\b',
            r'\bit is evident\b', r'\bdelving into\b',
            r'\bin the realm of\b', r'\bunderscores the\b',
            r'\bemphasizes the importance\b', r'\bplays a crucial role\b',
            r'\bpioneering\b', r'\bseamlessly\b', r'\brobust\b',
            r'\bcomprehensive\b', r'\blocally\b.*\bglobally\b',
            r'\bnotably\b', r'\bsignificantly enhances\b',
            r'\bensures\s+(that|the)\b', r'\bthis\s+enables\b',
            r'\bthis\s+allows\b', r'\bthis\s+ensures\b',
            r'\bthis\s+makes\s+it\b', r'\bthus\b',
            r'\bhence\b', r'\bthereby\b',
        ]
        phrase_count = sum(
            1 for p in ai_phrases
            if re.search(p, text, re.IGNORECASE)
        )
        if phrase_count >= 6:
            score += 0.22
            indicators.append(
                f"High frequency of AI transitional phrases ({phrase_count} detected)"
            )
        elif phrase_count >= 3:
            score += 0.12
            indicators.append(
                f"Several AI-typical transitional phrases ({phrase_count} detected)"
            )

        # ── Signal 3: No contractions (AI avoids them in formal text) ──
        contraction_re = (
            r"\b(don't|doesn't|won't|can't|isn't|aren't|wasn't|weren't|"
            r"I'm|I've|I'll|I'd|you're|they're|we're|it's|that's|"
            r"there's|here's|who's|what's|couldn't|wouldn't|shouldn't)\b"
        )
        contractions = len(re.findall(contraction_re, text, re.IGNORECASE))
        if word_count > 80 and contractions == 0:
            score += 0.14
            indicators.append("Zero contractions — formal AI writing pattern")
        elif word_count > 200 and contractions <= 1:
            score += 0.07

        # ── Signal 4: Sentence length uniformity ───────────────────────
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 10]
        if len(sentences) >= 6:
            lengths = [len(s.split()) for s in sentences]
            avg_len = sum(lengths) / len(lengths)
            variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
            std_dev = math.sqrt(variance)
            cv = std_dev / avg_len if avg_len > 0 else 1.0
            if cv < 0.28:
                score += 0.16
                indicators.append(
                    f"Very uniform sentence lengths (CV={cv:.2f}) — AI-typical regularity"
                )
            elif cv < 0.38:
                score += 0.07

        # ── Signal 5: Passive voice ratio ──────────────────────────────
        passive = len(re.findall(
            r'\b(is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b',
            text, re.IGNORECASE
        ))
        if word_count > 0:
            passive_ratio = passive / word_count
            if passive_ratio > 0.045:
                score += 0.10
                indicators.append(
                    f"High passive voice ratio ({passive_ratio:.3f}) — AI writing pattern"
                )

        # ── Signal 6: Technical AI definition patterns ─────────────────
        tech_def_patterns = [
            r'\b\w+\s+is\s+(?:a|an)\s+\w+\s+(?:used for|designed for|that allows|that enables|which allows|which enables)\b',
            r'\benabling\s+\w+(?:\s+\w+)?\s+(?:to|and)\b',
            r'\bwhich\s+(?:allows|enables|ensures|provides|facilitates)\b',
            r'\bcan\s+be\s+(?:used|applied|implemented|integrated)\b',
            r'\bprovides?\s+(?:a|an|the)\s+\w+\s+(?:way|method|approach|mechanism|framework)\b',
        ]
        tech_count = sum(
            1 for p in tech_def_patterns
            if re.search(p, text, re.IGNORECASE)
        )
        if tech_count >= 3:
            score += 0.12
            indicators.append(
                f"Multiple AI-style technical definition patterns ({tech_count})"
            )

        # ── Signal 7: Vocabulary uniformity / lexical density ──────────
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        if len(words) >= 60:
            unique_ratio = len(set(words)) / len(words)
            # AI text: 0.45–0.65 unique ratio — too uniform
            if 0.40 < unique_ratio < 0.65:
                score += 0.08
                indicators.append(
                    f"Vocabulary diversity pattern consistent with AI generation ({unique_ratio:.2f})"
                )

        # ── Signal 8: Over-complete list structure ──────────────────────
        bullet_lines = re.findall(
            r'(?:^|\n)\s*[•\-\*\u2022\u2023\u25e6]\s+\S',
            text
        )
        colon_headers = re.findall(r'(?:^|\n)\s*[A-Z][^:\n]{2,40}:\s*\n', text)
        if len(bullet_lines) >= 4 or len(colon_headers) >= 3:
            score += 0.08
            indicators.append(
                "Heavily list-structured format typical of AI content generation"
            )

        # ── Signal 9: Explicit AI disclaimers (instant flag) ───────────
        ai_self_refs = re.findall(
            r'\b(as an ai|as a language model|i cannot|i am unable|'
            r"i don't have personal|my training data|as an assistant|"
            r'i was trained)\b',
            text, re.IGNORECASE
        )
        if ai_self_refs:
            score = min(score + 0.50, 1.0)
            indicators.append("Explicit AI self-reference phrase detected")

        # ── Signal 10: Repetitive paragraph opening words ──────────────
        paragraphs = [p.strip() for p in text.split('\n') if len(p.strip()) > 40]
        if len(paragraphs) >= 4:
            first_words = [p.split()[0].lower() for p in paragraphs if p.split()]
            from collections import Counter
            fw_counter = Counter(first_words)
            most_common_freq = fw_counter.most_common(1)[0][1] if fw_counter else 0
            if most_common_freq >= 3 and most_common_freq / len(paragraphs) > 0.35:
                score += 0.08
                indicators.append(
                    f"Repetitive paragraph opening words ({fw_counter.most_common(1)[0][0]!r} x{most_common_freq})"
                )

        # ── Finalize ───────────────────────────────────────────────────
        score = round(min(score, 1.0), 3)
        # Lower threshold for educational/technical docs: 0.35 instead of 0.45
        is_ai = score >= 0.35

        if score >= 0.75:
            reasoning = (
                "Strong AI authorship indicators: structured numbered sections, "
                "formal definition style, zero contractions, uniform sentence length, "
                "and multiple AI-typical transitional phrases."
            )
        elif score >= 0.50:
            reasoning = (
                "Multiple AI writing patterns detected including structured formatting, "
                "formal academic phrasing, and absence of natural human variation."
            )
        elif score >= 0.35:
            reasoning = (
                "Several AI-typical patterns present: structured sections and formal "
                "phrasing suggest AI-assisted or AI-generated content."
            )
        elif score >= 0.20:
            reasoning = (
                "Some AI-typical patterns found but insufficient for confident "
                "AI classification. May be formal human-written content."
            )
        else:
            reasoning = (
                "Text shows natural human variation with organic structure, "
                "inconsistent sentence lengths, and informal phrasing."
            )

        return {
            "is_ai": is_ai,
            "confidence": score,
            "reasoning": reasoning,
            "indicators": indicators,
            "model": "Local Heuristic Analyzer (Enhanced)",
        }

    def detect(self, text: str) -> dict:
        """Main entry point for AI detection."""
        if self._use_granite:
            return self._detect_with_granite(text)
        return self._local_detect(text)
