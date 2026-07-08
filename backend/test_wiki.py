from plagiarism_engine import PlagiarismEngine

pe = PlagiarismEngine()

q = 'Embedded C programming language microcontrollers'
wiki = pe._search_wikipedia(q)
print("Wikipedia API results:", len(wiki))
for r in wiki[:4]:
    print(" TITLE:", r["title"][:70])
    print(" URL  :", r["url"])
    print()
