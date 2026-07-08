from text_extractor import TextExtractor
from ai_detector import AIDetector
from plagiarism_engine import PlagiarismEngine

te = TextExtractor()
print("TextExtractor OK")

ad = AIDetector()
sample = (
    "Furthermore, this research highlights the importance of academic integrity. "
    "Moreover, it is important to note that plagiarism undermines the educational process. "
    "In conclusion, all students should submit original work. "
    "Additionally, the institution emphasizes the need for transparency in scholarly endeavors."
)
result = ad._local_detect(sample)
print("AIDetector local: is_ai=%s, confidence=%.3f, model=%s" % (result["is_ai"], result["confidence"], result["model"]))

pe = PlagiarismEngine()
print("PlagiarismEngine OK")

sim = pe._compute_similarity(
    "The quick brown fox jumps over the lazy dog",
    "A quick brown fox leaped over the lazy sleeping dog"
)
print("Similarity: %.4f" % sim)

docs = {
    "doc1.txt": "Machine learning is a type of artificial intelligence that allows computers to learn without being explicitly programmed.",
    "doc2.txt": "Machine learning is a kind of AI that lets computers learn without explicit programming instructions.",
    "doc3.txt": "The weather today is sunny and warm with light winds from the southwest.",
}
cross = pe.compare_documents(docs)
print("Cross-doc comparison:")
for fname, matches in cross.items():
    for m in matches:
        print("  %s <-> %s: %.2f%%" % (fname, m["matched_file"], m["similarity_pct"]))

print("\n=== ALL BACKEND TESTS PASSED ===")
