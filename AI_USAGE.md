# AI usage

**Tools:** Claude Code (Claude, by Anthropic) as the main assistant, with Plan Mode and Claude skills; Google Gemini for occasional second opinions.

**How I worked.** I started in **Plan Mode**, not with code. I gave Claude the PDF, had it list the explicit and implicit requirements (who may Save vs Delete, duplicate saves, a reload on Screen 3, BiDi inside inputs), and settled the architecture and the decisions in `DECISIONS.md` before any file was written. Claude then wrote most of the code, tests and first drafts of these documents under my direction. I made the calls: PostgreSQL over a JSON file, Pinia, shadcn-vue themed to match finqai.co.il, enums and named constants over magic values, and cutting what I could not defend. I used Claude **skills** for focused passes: `frontend-design` for the visual direction (modelled on finqai.co.il) and `code-review` for an independent review, which found real bugs that I verified and fixed. I used **Gemini** a little, to cross-check a few decisions and the wording. Claude also ran the checks and the three test suites, and probed 6,000 live randomuser.me records against the server's validation, which surfaced the double-dot email bug.

I reviewed every file and ran the app myself. I can explain any line, and anything I could not, I removed.
