# Note for the Lenovo: Janet's question about transcript quotes (Reading Room)

Added 2026-11-18. Read this the next time you edit the Reading Room. It belongs with
`temp/libalex-reading-rooms-brief.md` (branch `claude/reading-rooms-blender-portals-ysjhnf`). It was
put on a separate branch so it would not clash with your edits there.

## What Janet wrote (verbatim)

> I notice that sometimes the transcription gives a quote, and in the text of the transcript, there
> are opening quotes but not closing quotes. Does this matter? It doesn't seem to affect the sound,
> but if people with access to the audiobook have access to the transcript, it does. Let me know if
> that is something I should correct, too. Thanks,
> Janet

## The short answer for Janet

Yes, it matters. Listeners can't hear it, but anyone who reads the transcript sees it: people who
follow along, deaf and hard-of-hearing readers, screen readers, search. An unclosed quote also makes
it hard to tell where the quotation ends and the narration begins. **Please don't fix them by hand
yet** until we've checked the two points below. If the cause is systematic, we fix it once at the
source, not line by line.

## Check these first (before anyone corrects anything)

1. **Is it really an error?** In printed books, a quotation that runs over several paragraphs has an
   opening quote on *every* paragraph and a closing quote only on the *last* one. That is correct
   typography, not a mistake. Count how many of Janet's cases are this. Leave those alone.
2. **Where does the transcript come from?**
   - If it is generated from the edition text (manuscript or EPUB), the dropped quote is a bug in
     whatever splits the text into transcript segments. A segment boundary falls inside a quotation,
     and the closing mark ends up in the next segment or gets lost. Fix the splitter and regenerate.
     Don't hand-edit the output (house rule in `CLAUDE.md`).
   - If it is speech-to-text from the recording, the recogniser guessed the quote marks. Better fix:
     align the transcript to the edition text, so the punctuation comes from the book and not from the
     guess.
   - If it really is hand-typed, then Janet correcting it is right. Give her the rule from point 1, so
     she doesn't "close" the multi-paragraph quotes.
3. **Find them all, not just the ones she noticed.** Run a quick check of open vs. close quote counts
   per paragraph, skipping the multi-paragraph quotations. Report the number, and send Janet the list
   if she is going to fix them by hand.

## Reply to Janet

Once you know which of the three cases it is, tell Edward. Edward, or you through him, answers her.
Thank her: it's a good catch.
