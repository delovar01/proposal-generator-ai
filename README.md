# Proposal Generator AI

A zero-build web app for generating **professional commercial proposals** with the OpenAI API. Built with vanilla JavaScript, styled like a modern B2B SaaS dashboard, and fully client-side — your API key never leaves the browser.

![App screenshot](docs/screenshot.png)

> _Replace the image above with your own screenshot after you launch the app locally._

---

## Features

- **Two-panel layout** — a structured input form on the left, a live HTML preview on the right.
- **OpenAI GPT-4o-mini** under the hood, called with a carefully engineered prompt (JSON mode, strict schema).
- **Bilingual output** — Russian (`ru`) and English (`en`).
- **Three tones of voice** — Formal / Friendly / Aggressive (sales-driven).
- **Rich, ready-to-send document** — intro, service description, advantages, deliverables, pricing block, timeline, call to action, signature.
- **PDF export** via jsPDF + html2canvas (Cyrillic-safe, paginates long proposals into multiple A4 pages).
- **Copy to clipboard** in plain-text format.
- **Regenerate** button to try a new wording with the same brief.
- **Local persistence** — the API key, the last-used form inputs, and the last generated proposal are stored in `localStorage`.
- **No build step, no framework, no backend** — one HTML file plus a few JS/CSS files.

---

## Tech Stack

| Layer | Choice |
|------|--------|
| UI | Vanilla JS + HTML + CSS (Inter via Google Fonts) |
| LLM | [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat), model `gpt-4o-mini` |
| PDF | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) + [html2canvas 1.4.1](https://html2canvas.hertzen.com/) |
| Storage | Browser `localStorage` (API key + last session) |

---

## Project Structure

```
proposal-generator-ai/
├── index.html         # Markup, layout, script includes
├── style.css          # Dark-blue SaaS theme, proposal-doc styling
├── app.js             # UI glue: state, form, render, actions
├── generator.js       # Prompt engineering + OpenAI call
├── pdf-export.js      # html2canvas → jsPDF multi-page export
├── README.md
└── .gitignore
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/<your-user>/proposal-generator-ai.git
cd proposal-generator-ai
```

### 2. Get an OpenAI API key

Create one at <https://platform.openai.com/api-keys>. A key starts with `sk-...`.

> The model used is `gpt-4o-mini`, which is very cheap — each proposal typically costs a fraction of a cent.

### 3. Serve the folder

This is a pure static app, but **you cannot open `index.html` as a `file://` URL**, because the browser will block the OpenAI API call due to CORS/Origin rules. Use any static server:

```bash
# Option A — Python 3
python3 -m http.server 5173

# Option B — Node (no install)
npx serve .

# Option C — VS Code "Live Server" extension
```

Then open <http://localhost:5173>.

### 4. Use the app

1. Paste your OpenAI API key into the field in the top-right and press **Save** (optional — otherwise the key lives only for this session).
2. Fill in the brief on the left: sender, recipient, service, 1–3 advantages, budget range, currency, timeframe.
3. Choose tone and language.
4. Hit **Generate proposal**.
5. Use **Copy text**, **Download PDF**, or **Regenerate**.

---

## How the Prompt Works

`generator.js` sends two messages to `chat/completions`:

1. A **system prompt** that sets the assistant up as a senior B2B copywriter, forbids clichés/fluff, and mandates strict JSON output.
2. A **user prompt** that injects all form fields and specifies a precise JSON schema (`title`, `subtitle`, `intro`, `serviceDescription`, `advantages[]`, `deliverables[]`, `pricing{amount,note}`, `timeline`, `cta{headline,text}`, `signature{name,contact}`).

Parameters used:

- `model: "gpt-4o-mini"`
- `temperature: 0.75`
- `top_p: 0.95`
- `response_format: { "type": "json_object" }`

The app then validates/normalizes the returned JSON and renders it into the styled document.

---

## Sample Output (excerpt)

**Input brief:**
- Sender: _Acme Studio_
- Recipient: _Globex Corp._
- Service: _End-to-end website redesign for a B2B SaaS landing + onboarding flow._
- Advantages: _Figma-to-code under 2 weeks · conversion-focused UX · bilingual team_
- Budget: $12 000 – $18 000
- Timeframe: 6 weeks
- Tone: Formal · Language: English

**Generated (abridged):**

> ### Redesigning Globex's SaaS Experience for Measurable Growth
> _A proposal from Acme Studio for Globex Corp._
>
> Globex's current site communicates the product clearly but does not convert the traffic your marketing team is already paying for. Based on our review, we believe a focused redesign of the landing page and onboarding flow can lift activation meaningfully without a platform migration.
>
> **Service overview** — We will redesign the public site and the first-run onboarding in Figma, then ship production-ready React components to your repository. Each deliverable is validated against conversion hypotheses tied to your funnel metrics...
>
> **Key advantages**
> - **Figma-to-code in under 2 weeks.** Our paired design-engineering teams close the handoff gap, compressing the usual 4-week cycle.
> - **Conversion-focused UX.** Every screen ships with a measurable hypothesis and success metric agreed up front.
> - **Bilingual team.** Russian and English speakers on both design and engineering — no translation loss in stand-ups.
>
> **Investment:** from $12 000 to $18 000 (USD). Fixed-scope, VAT not included.
>
> **Next step — Book a 30-minute discovery call.** Reply to this email or pick a slot at acme.studio/call, and we will tailor the scope to your Q3 priorities.

---

## Privacy & Security

- Your **OpenAI API key** is stored **only in your browser's `localStorage`** and sent directly from your browser to `api.openai.com` over HTTPS.
- Nothing is ever sent to any third-party server from this app.
- If you share a device, use the **Clear** button next to the key field before leaving.

---

## Known Limitations

- Calls go from the **browser** directly to OpenAI, which exposes the key to anyone with DevTools access on that machine. Treat the key like any other local credential, and prefer a backend proxy for production deployments.
- First PDF export on a slow connection can take a moment while jsPDF + html2canvas load from the CDN.
- The UI is optimised for desktop (≥ 1080 px). On mobile the two panels stack vertically.

---

## License

MIT — do whatever you want with this, just keep a reference.
