# Writing Quest ✏️

A friendly, web-based **writing-support app** that helps a young student turn big
ideas into written words. Built as a final project for a graduate special-education
course, it shows how an educator can create a customized assistive-technology tool.

**Live site:** https://ctaylortodd.github.io/writing-quest/

> Best in **Google Chrome** — the talk-to-write (dictation) feature uses a browser
> capability that works most reliably there. Everything else works in any browser.

## What it does

- 🎤 **Talk-to-write** — speak your ideas and they turn into text.
- ⏱️ **Short bursts** — 3 / 5 / 10-minute focus timers keep tasks manageable.
- 🗂️ **Prompts & organizers** — interest-based prompts, sentence starters, and a
  step-by-step **five-paragraph essay builder**.
- ✨ **Figurative language helper** — tap to add similes, metaphors, and more.
- 🎉 **Encouragement** — friendly feedback and a celebration when you finish.
- 🏅 **Progress & badges** — track words written, writings finished, and a day streak.
- 🔊 **Read aloud** and ⬇️ **Save to Word** so writing can be shared.
- 👀 **Built for focus** — large text, high contrast, a contrast toggle, and a
  calm, low-clutter layout. Animations respect "reduce motion."

## How it's built

Plain **HTML, CSS, and JavaScript** — no frameworks, no build step, and no server.
Dictation and read-aloud use the browser's built-in Web Speech API, and progress is
saved in the browser (localStorage). That makes it free to host and easy to run.

## Run it locally

From this folder:

```
python3 -m http.server 8765
```

Then open **http://localhost:8765** in Chrome.

---

_Created for a special-education course project. The student described in the project
is a fictional case study._
