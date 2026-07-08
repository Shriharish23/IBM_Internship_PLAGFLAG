from ai_detector import AIDetector

ad = AIDetector()

# Exact format as pdfplumber would extract from the Embedded C PDF
# (as visible in the screenshot text preview)
text_as_pdf_extracted = (
    "1. Introduction to Embedded C Definition Embedded C is an extension of the C programming language "
    "used for programming embedded systems and microcontrollers, enabling direct hardware interaction, real- "
    "time execution, and memory-efficient programming. Key Features 1. Hardware Interaction Embedded C "
    "allows direct access to hardware registers, ports, and memory addresses, enabling control over devices "
    "like LEDs, sensors, and motors. 2. Real- Time Execution Embedded C supports real-time applications, "
    "ensuring timely and deterministic responses to external events, making it suitable for time-critical "
    "systems. 3. Memory Efficiency Embedded C is designed for systems with limited memory, using minimal "
    "resources for efficient operation. 4. Portability Although hardware-specific, Embedded C can be "
    "ported to different microcontroller architectures with minor modifications. 5. Low-Level Programming "
    "Embedded C provides low-level access to hardware, enabling precise control over system resources. "
    "2. Applications of Embedded C Embedded C is widely used in: Automotive Systems: Engine control "
    "units, ABS. Medical Devices: Pacemakers, insulin pumps. Consumer Electronics: Smart TVs, washing "
    "machines. Industrial Automation: PLCs, robotics. 3. Advantages of Embedded C Direct hardware control. "
    "Real-time performance. Memory efficiency. Portability. Wide industry adoption. 4. Disadvantages of "
    "Embedded C Hardware dependency. Limited standard library. Debugging complexity. Steep learning curve. "
    "5. Conclusion Embedded C remains a vital programming language for embedded systems, offering a balance "
    "between performance and control. Its ability to interact directly with hardware makes it indispensable "
    "in industries requiring reliable and efficient embedded solutions."
)

print("=== Testing with PDF-extracted text format ===\n")
result = ad._local_detect(text_as_pdf_extracted)
print("is_ai:", result["is_ai"])
print("confidence:", result["confidence"], "(", round(result["confidence"]*100,1), "% )")
print("model:", result["model"])
print()
print("Indicators detected:")
for ind in result["indicators"]:
    print(" -", ind)
print()
print("Verdict:", "AI GENERATED" if result["is_ai"] else "NOT AI (score=" + str(result["confidence"]) + ")")
