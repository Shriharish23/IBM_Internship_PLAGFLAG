from ai_detector import AIDetector
from plagiarism_engine import PlagiarismEngine

text = (
    "1. Introduction to Embedded C\n"
    "Definition Embedded C is an extension of the C programming language used for programming "
    "embedded systems and microcontrollers, enabling direct hardware interaction, real-time execution, "
    "and memory-efficient programming.\n"
    "Key Features\n"
    "1. Hardware Interaction Embedded C allows direct access to hardware registers, ports, and memory "
    "addresses, enabling control over devices like LEDs, sensors, and motors.\n"
    "2. Real-Time Execution Embedded C supports real-time applications, ensuring timely and "
    "deterministic responses to external events.\n"
    "3. Memory Efficiency Embedded C is optimized for systems with limited memory, using minimal "
    "resources for efficient operation.\n"
    "4. Portability Embedded C can be used across different microcontroller architectures with "
    "minor modifications.\n"
    "5. Low-Level Programming Embedded C provides low-level access to hardware, enabling precise "
    "control over system resources.\n"
    "Applications of Embedded C: automotive systems, medical devices, consumer electronics, "
    "industrial automation.\n"
    "Advantages: Direct hardware control, Real-time performance, Memory efficiency.\n"
    "Disadvantages: Complexity, Limited standard library support, Debugging challenges."
)

print("=== PLAGFLAG COMPLETE TEST ===\n")

ad = AIDetector()
ai_result = ad.detect(text)
print("[AI DETECTION]")
print("  Is AI:", ai_result["is_ai"])
print("  Confidence:", round(ai_result["confidence"] * 100, 1), "%")
print("  Model:", ai_result["model"])
print("  Reasoning:", ai_result["reasoning"][:100])
print("  Indicators:", ai_result["indicators"][:3])
print()

pe = PlagiarismEngine()
sources = pe.search_web(text)
print("[WEB PLAGIARISM SEARCH]")
print("  Sources found:", len(sources))
if sources:
    max_sim = max(s["similarity_pct"] for s in sources)
    print("  Max similarity:", round(max_sim, 1), "%")
    for s in sources[:3]:
        print("   -", round(s["similarity_pct"], 1), "% |", s["title"][:60])
else:
    print("  No sources found")
    max_sim = 0
print()

overall = max_sim if sources else 0
if ai_result["is_ai"]:
    verdict = "AI_GENERATED"
elif overall >= 70:
    verdict = "HIGH_PLAGIARISM"
elif overall >= 40:
    verdict = "MODERATE_PLAGIARISM"
elif overall >= 15:
    verdict = "LOW_SIMILARITY"
else:
    verdict = "ORIGINAL"

print("[FINAL VERDICT]")
print("  Web Similarity:", round(overall, 1), "%")
print("  AI Confidence:", round(ai_result["confidence"] * 100, 1), "%")
print("  Verdict:", verdict)
print()
if verdict == "AI_GENERATED":
    print("RESULT: Document will be FLAGGED as AI GENERATED")
elif verdict in ("HIGH_PLAGIARISM", "MODERATE_PLAGIARISM"):
    print("RESULT: Document will be FLAGGED for PLAGIARISM")
elif verdict == "LOW_SIMILARITY":
    print("RESULT: LOW similarity detected, sources shown")
else:
    print("RESULT: ORIGINAL")
