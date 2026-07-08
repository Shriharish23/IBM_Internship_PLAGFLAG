import re
import time
import requests
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import nltk
from urllib.parse import quote_plus, urljoin
import json

# Download NLTK data silently
for resource in ['tokenizers/punkt', 'corpora/stopwords', 'tokenizers/punkt_tab']:
    try:
        nltk.data.find(resource)
    except LookupError:
        name = resource.split('/')[-1]
        nltk.download(name, quiet=True)


class PlagiarismEngine:
    """
    Plagiarism detection engine.
    
    Search strategy (in order, all combined):
      1. Wikipedia Search API   — reliable, no bot-blocking, academic content
      2. DuckDuckGo HTML        — lightweight, less aggressive blocking
      3. Bing HTML              — regex-parsed hrefs from page source
      4. Google Custom Search   — final attempt with full headers
      5. Direct domain probes   — Wikipedia, Britannica, GeeksforGeeks, MDN, etc.
    """

    # Firefox-like headers — less likely to be blocked than Chrome UA
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    # Trusted domains to probe directly based on topic keywords
    DOMAIN_PROBES = {
        "programming": [
            "https://en.wikipedia.org/wiki/{query}",
            "https://www.geeksforgeeks.org/{query}/",
            "https://www.tutorialspoint.com/{query}/",
        ],
        "science": [
            "https://en.wikipedia.org/wiki/{query}",
            "https://www.britannica.com/science/{query}",
        ],
        "default": [
            "https://en.wikipedia.org/wiki/{query}",
        ],
    }

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 3),
            max_features=15000,
            sublinear_tf=True,
        )
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

    # ──────────────────────────────────────────────────────
    #  Text helpers
    # ──────────────────────────────────────────────────────

    def _extract_sentences(self, text: str, n: int = 5) -> list:
        try:
            sentences = nltk.sent_tokenize(text)
        except Exception:
            sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]

        sentences = [s.strip() for s in sentences if 20 <= len(s) <= 300]

        if not sentences:
            words = text.split()
            sentences = [' '.join(words[i:i+20]) for i in range(0, min(100, len(words)), 20)]

        if len(sentences) <= n:
            return sentences

        step = len(sentences) // n
        return [sentences[i * step] for i in range(n)]

    def _build_queries(self, text: str) -> list:
        """Build multiple short search queries from the text."""
        sentences = self._extract_sentences(text, n=4)
        queries = []
        for sent in sentences:
            # Clean up and trim
            q = re.sub(r'\s+', ' ', sent).strip()
            # Keep 8–14 words — best for search engines
            words = q.split()
            if len(words) > 14:
                q = ' '.join(words[:14])
            if len(q) >= 25:
                queries.append(q)
        # Deduplicate
        seen = set()
        out = []
        for q in queries:
            if q not in seen:
                seen.add(q)
                out.append(q)
        return out[:4]

    # ──────────────────────────────────────────────────────
    #  Source 1: Wikipedia Search API (most reliable)
    # ──────────────────────────────────────────────────────

    def _search_wikipedia(self, query: str) -> list:
        """Use Wikipedia's public search API — no bot blocking."""
        results = []
        try:
            api_url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 6,
                "format": "json",
                "srprop": "snippet|titlesnippet",
            }
            resp = self.session.get(api_url, params=params, timeout=8)
            data = resp.json()
            for item in data.get("query", {}).get("search", []):
                title = item.get("title", "")
                snippet = BeautifulSoup(item.get("snippet", ""), "lxml").get_text()
                page_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                results.append({
                    "url": page_url,
                    "title": f"{title} — Wikipedia",
                    "snippet": snippet,
                    "source": "Wikipedia",
                })
        except Exception:
            pass
        return results

    # ──────────────────────────────────────────────────────
    #  Source 2: DuckDuckGo HTML (light bot protection)
    # ──────────────────────────────────────────────────────

    def _search_duckduckgo(self, query: str) -> list:
        """DuckDuckGo HTML endpoint — less aggressive blocking."""
        results = []
        try:
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            resp = self.session.get(url, timeout=10)
            soup = BeautifulSoup(resp.text, "lxml")
            for div in soup.find_all("div", class_="result__body")[:8]:
                a = div.find("a", class_="result__a")
                snip = div.find("a", class_="result__snippet")
                if not a:
                    continue
                href = a.get("href", "")
                # DDG wraps URLs
                if "uddg=" in href:
                    from urllib.parse import unquote, parse_qs, urlparse
                    parsed = parse_qs(urlparse(href).query)
                    href = unquote(parsed.get("uddg", [href])[0])
                if not href.startswith("http"):
                    continue
                results.append({
                    "url": href,
                    "title": a.get_text(strip=True),
                    "snippet": snip.get_text(strip=True) if snip else "",
                    "source": "DuckDuckGo",
                })
        except Exception:
            pass
        return results

    # ──────────────────────────────────────────────────────
    #  Source 3: Bing via regex href extraction
    # ──────────────────────────────────────────────────────

    def _search_bing(self, query: str) -> list:
        """Extract result URLs from Bing's raw HTML via regex."""
        results = []
        try:
            url = f"https://www.bing.com/search?q={quote_plus(query)}&count=10"
            resp = self.session.get(url, timeout=10)

            # Method A: BeautifulSoup structured parse
            soup = BeautifulSoup(resp.text, "lxml")
            for li in soup.find_all("li", class_="b_algo")[:8]:
                h2 = li.find("h2")
                a = li.find("a", href=True)
                p = li.find("p")
                if a and a["href"].startswith("http"):
                    results.append({
                        "url": a["href"],
                        "title": h2.get_text(strip=True) if h2 else a.get_text(strip=True),
                        "snippet": p.get_text(strip=True) if p else "",
                        "source": "Bing",
                    })

            # Method B: regex fallback — extract all cite tags (Bing puts URLs in <cite>)
            if not results:
                cites = soup.find_all("cite")
                h2_list = soup.find_all("h2")
                for i, cite in enumerate(cites[:8]):
                    raw = cite.get_text(strip=True)
                    if not raw.startswith("http"):
                        raw = "https://" + raw
                    title = h2_list[i].get_text(strip=True) if i < len(h2_list) else raw
                    results.append({
                        "url": raw,
                        "title": title,
                        "snippet": "",
                        "source": "Bing",
                    })
        except Exception:
            pass
        return results

    # ──────────────────────────────────────────────────────
    #  Source 4: Google with aggressive headers
    # ──────────────────────────────────────────────────────

    def _search_google(self, query: str) -> list:
        """Try Google with full browser-like headers."""
        results = []
        try:
            headers = {
                **self.HEADERS,
                "Cookie": "CONSENT=YES+cb; SID=; HSID=; SSID=;",
                "Referer": "https://www.google.com/",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
            }
            url = f"https://www.google.com/search?q={quote_plus(query)}&num=10&hl=en"
            resp = self.session.get(url, timeout=10, headers=headers)
            soup = BeautifulSoup(resp.text, "lxml")

            # Multiple selector strategies for Google's ever-changing HTML
            for container in soup.find_all(["div", "li"]):
                a = container.find("a", href=True)
                if not a:
                    continue
                href = a["href"]
                if href.startswith("/url?q="):
                    href = href[7:].split("&")[0]
                if not href.startswith("http") or "google" in href:
                    continue
                h3 = container.find("h3")
                title = h3.get_text(strip=True) if h3 else a.get_text(strip=True)
                if title and href not in [r["url"] for r in results]:
                    results.append({
                        "url": href,
                        "title": title,
                        "snippet": "",
                        "source": "Google",
                    })
                    if len(results) >= 8:
                        break
        except Exception:
            pass
        return results

    # ──────────────────────────────────────────────────────
    #  Source 5: Direct Wikipedia page fetch
    # ──────────────────────────────────────────────────────

    def _direct_wikipedia_fetch(self, text: str) -> list:
        """
        Extract 3-5 key terms from the text and fetch Wikipedia pages directly.
        Works even when all search engines block scraping.
        """
        # Extract noun phrases / key terms
        # Simple approach: take capitalized or technical multi-word phrases
        key_phrases = []

        # Find definitions: "X is a Y" or "X are Y"
        definition_matches = re.findall(
            r'\b([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:is|are)\s+(?:a|an|the)\s+',
            text
        )
        key_phrases.extend(definition_matches[:3])

        # Find technical terms (CamelCase or ALL_CAPS or specific patterns)
        tech_terms = re.findall(r'\b([A-Z][a-zA-Z0-9]{2,}(?:\s[A-Z][a-zA-Z]+)*)\b', text)
        key_phrases.extend(tech_terms[:4])

        # Also use first meaningful words of the document
        first_words = ' '.join(text.split()[:8])
        key_phrases.append(first_words)

        results = []
        seen = set()
        for phrase in key_phrases[:5]:
            wiki_title = phrase.strip().replace(' ', '_')
            if not wiki_title or wiki_title in seen:
                continue
            seen.add(wiki_title)
            url = f"https://en.wikipedia.org/wiki/{wiki_title}"
            results.append({
                "url": url,
                "title": f"{phrase.strip()} — Wikipedia",
                "snippet": f"Wikipedia article about {phrase.strip()}",
                "source": "Wikipedia (direct)",
            })
        return results

    # ──────────────────────────────────────────────────────
    #  Page content fetcher
    # ──────────────────────────────────────────────────────

    def _fetch_page_content(self, url: str) -> str:
        """Fetch and extract clean text from a URL."""
        try:
            resp = self.session.get(url, timeout=8, allow_redirects=True)
            if resp.status_code not in (200, 301, 302):
                return ""
            ct = resp.headers.get("content-type", "")
            if "text" not in ct and "html" not in ct:
                return ""
            soup = BeautifulSoup(resp.text, "lxml")
            for tag in soup(["script", "style", "nav", "footer", "header",
                              "aside", "form", "iframe", "noscript"]):
                tag.decompose()
            text = " ".join(soup.get_text(separator=" ", strip=True).split())
            return text
        except Exception:
            return ""

    # ──────────────────────────────────────────────────────
    #  Similarity computation
    # ──────────────────────────────────────────────────────

    def _compute_similarity(self, text1: str, text2: str) -> float:
        """TF-IDF cosine similarity."""
        if not text1.strip() or not text2.strip():
            return 0.0
        try:
            # Fresh vectorizer each call to avoid state issues
            vec = TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),
                max_features=10000,
                sublinear_tf=True,
            )
            vecs = vec.fit_transform([text1[:6000], text2[:6000]])
            sim = cosine_similarity(vecs[0], vecs[1])[0][0]
            return float(np.clip(sim, 0.0, 1.0))
        except Exception:
            return self._fallback_similarity(text1, text2)

    def _fallback_similarity(self, text1: str, text2: str) -> float:
        """Jaccard word overlap — robust fallback."""
        words1 = set(re.findall(r'\b[a-zA-Z]{3,}\b', text1.lower()))
        words2 = set(re.findall(r'\b[a-zA-Z]{3,}\b', text2.lower()))
        if not words1 or not words2:
            return 0.0
        return len(words1 & words2) / len(words1 | words2)

    def _sentence_overlap(self, doc_text: str, page_text: str) -> float:
        """
        Check what fraction of the document's sentences appear verbatim
        or near-verbatim in the page content.
        """
        if not page_text:
            return 0.0
        sentences = self._extract_sentences(doc_text, n=8)
        page_lower = page_text.lower()
        hits = 0
        for sent in sentences:
            if len(sent) < 20:
                continue
            # Exact substring check
            if sent.lower() in page_lower:
                hits += 1
            else:
                # Check 10-word chunks
                words = sent.split()
                for i in range(0, len(words) - 6, 5):
                    chunk = ' '.join(words[i:i+8]).lower()
                    if chunk in page_lower:
                        hits += 0.5
                        break
        return min(hits / len(sentences), 1.0) if sentences else 0.0

    # ──────────────────────────────────────────────────────
    #  Main public API
    # ──────────────────────────────────────────────────────

    def search_web(self, text: str) -> list:
        """
        Search multiple sources for similar content and return scored list.
        Combines Wikipedia API, DDG, Bing, Google, and direct Wikipedia fetches.
        """
        queries = self._build_queries(text)
        if not queries:
            queries = [' '.join(text.split()[:12])]

        primary_query = queries[0]

        # --- Gather candidates from all sources ---
        all_links = []
        seen_urls = set()

        def add_results(results):
            for r in results:
                u = r['url']
                if u and u not in seen_urls and u.startswith('http'):
                    seen_urls.add(u)
                    all_links.append(r)

        # 1. Wikipedia API (most reliable — always works)
        add_results(self._search_wikipedia(primary_query))
        if len(queries) > 1:
            add_results(self._search_wikipedia(queries[1]))

        # 2. DuckDuckGo
        time.sleep(0.3)
        add_results(self._search_duckduckgo(primary_query))

        # 3. Bing
        time.sleep(0.3)
        add_results(self._search_bing(primary_query))

        # 4. Google
        time.sleep(0.4)
        add_results(self._search_google(primary_query))

        # 5. Direct Wikipedia pages derived from the document text
        add_results(self._direct_wikipedia_fetch(text))

        # --- Score each candidate ---
        scored = []
        doc_sentences = self._extract_sentences(text, n=8)

        for link in all_links[:15]:
            page_content = self._fetch_page_content(link['url'])
            if not page_content or len(page_content) < 80:
                # Use snippet similarity only
                snippet = link.get('snippet', '')
                if not snippet:
                    continue
                snip_sim = self._compute_similarity(text[:600], snippet)
                if snip_sim > 0.08:
                    scored.append({
                        **link,
                        "similarity": round(snip_sim * 0.6, 4),
                        "similarity_pct": round(snip_sim * 60, 2),
                    })
                continue

            # Full content scoring: combine three signals
            # A: document-level TF-IDF cosine similarity
            tfidf_sim = self._compute_similarity(text, page_content)

            # B: sentence-level overlap
            sent_overlap = self._sentence_overlap(text, page_content)

            # C: query terms present ratio
            query_words = set(primary_query.lower().split())
            page_words = set(page_content.lower().split())
            query_hit_ratio = len(query_words & page_words) / max(len(query_words), 1)

            # Weighted combination
            combined = (
                tfidf_sim * 0.50 +
                sent_overlap * 0.35 +
                query_hit_ratio * 0.15
            )
            combined = float(np.clip(combined, 0.0, 1.0))

            if combined > 0.04:
                scored.append({
                    "url": link['url'],
                    "title": link.get('title', link['url']),
                    "snippet": link.get('snippet', '')[:300],
                    "similarity": round(combined, 4),
                    "similarity_pct": round(combined * 100, 2),
                    "search_engine": link.get('source', 'Web'),
                })
            time.sleep(0.15)

        scored.sort(key=lambda x: x['similarity'], reverse=True)
        return scored[:8]

    def compare_documents(self, file_texts: dict) -> dict:
        """Cross-compare all documents — pairwise TF-IDF similarity matrix."""
        filenames = list(file_texts.keys())
        texts = list(file_texts.values())
        n = len(filenames)

        if n < 2:
            return {fn: [] for fn in filenames}

        try:
            vec = TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),
                max_features=10000,
                sublinear_tf=True,
            )
            vecs = vec.fit_transform(texts)
            sim_matrix = cosine_similarity(vecs)
        except Exception:
            sim_matrix = np.zeros((n, n))
            for i in range(n):
                for j in range(n):
                    if i != j:
                        sim_matrix[i][j] = self._fallback_similarity(texts[i], texts[j])

        cross_matches = {fn: [] for fn in filenames}
        for i in range(n):
            for j in range(n):
                if i != j:
                    sim = float(sim_matrix[i][j])
                    if sim > 0.10:
                        cross_matches[filenames[i]].append({
                            "matched_file": filenames[j],
                            "similarity": round(sim, 4),
                            "similarity_pct": round(sim * 100, 2),
                        })
            cross_matches[filenames[i]].sort(key=lambda x: x['similarity'], reverse=True)

        return cross_matches
