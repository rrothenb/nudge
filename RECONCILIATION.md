# Reconciliation: Repo vs. `DESIGN_GUIDANCE.md`

**Purpose:** `DESIGN_GUIDANCE.md` refines the project toward a Wikipedia-like, fully-attributed fact
layer with trust on every assertion and **metrics as the central deliverable**. This document maps
the *existing repo* against that guidance and says what actually needs to change.

**Framing (read this first):** the guidance is a **refinement, not a restart.** Most of the built
backend (assertion store, import pipeline, generation, onboarding, trust plumbing) is reusable. The
real work concentrates in three places: the **trust inference mechanism**, a **metrics layer that
doesn't exist yet**, and a few **product surfaces** (openness dial, multi-source facts). Adversarial/
Sybil hardening and multi-surface breadth are *deferrals*, not corrections.

**Legend — severity:** 🔴 core to the thesis · 🟠 needed for the MVP · 🟡 docs/scope cleanup.
**Status tags:** `[change code]` · `[build new]` · `[defer]` · `[docs only]`.

---

## 🔴 Core to the thesis

### R1 — Trust inference: fact-mediated & downward, not source-vector similarity `[change code]`
- **Guidance:** §3.2 wants calculated source-trust derived from **fact-level** signal — when a user
  rates an *assertion* that an unrated source also supports — and §3.1 says that signal is
  predominantly **downward** (users knock down surfaced facts they disbelieve; upward ratings are
  rare because under-rated facts stay unseen). §6.2 explicitly cautions against keying similarity on
  source-trust vectors.
- **Repo today:** `backend/lib/trust/similarity.ts` + `propagation.ts` infer trust via cosine
  similarity over users' **source-trust vectors** ("find people like me") — the symmetric design
  §6.2 warns clusters by tribe and predicts inward. There is no fact-mediated path and no
  asymmetric handling of downward signal.
- **Concrete change:**
  - Add the fact-mediated inference: explicit assertion-trust → adjust calculated trust of unrated
    sources that support/contradict that assertion. Build it **downward-first** (a knock-down of a
    surfaced fact lowers calculated trust in sources backing it, and relates the user to others who
    rated it the same way). Treat upward ratings as the rare bonus case.
  - Demote source-trust-vector similarity: don't let it be the mechanism that personalizes what
    crosses tribal lines. Keep it (if at all) only where §6.2's clustering risk doesn't apply.
  - Stop describing "Finds 'People Like Me'" as the headline feature (README, docs) — per §6.2 that
    is the failure mode, not the goal.

### R2 — Propagation direction must be instrumented, not assumed `[change code]` `[build new]`
- **Guidance:** §6.1 — the *direction* a fact-level action propagates is an **open design variable
  and part of the experiment**, not a settled law. Bridging actions (trust up off-tribe / down
  on-tribe) may need to propagate differently from reinforcing ones; the metrics decide.
- **Repo today:** propagation is symmetric, with no notion of tribe/valence/direction — so you
  *cannot currently see* which way it's pushing.
- **Concrete change:** make propagation direction a visible, configurable parameter and **instrument
  it** (log valence of each propagating action) so §4 metrics can show whether it's bridging or
  bubble-reinforcing. Do **not** hard-code a sign as if settled; the point is to measure it.

### R3 — Metrics layer ("the product") `[build new]`
- **Guidance:** §4 — instrumentation is the central deliverable: activity **proxies** (engagement,
  dial movement, cross-source facts surfaced, trust edges) kept *separate* from **ground truth**
  (periodic out-group-affect / feeling-thermometer), with a dashboard that makes the **proxies-up /
  thermometer-down divergence** loud (§4.2), plus the self-report caveat (§4.3).
- **Repo today:** none of this exists. Only CloudWatch infra metrics (`README.md:552`).
- **Concrete change:** build it — affect capture, proxy capture, the divergence dashboard. This is
  the most under-built, highest-priority piece per §5.

---

## 🟠 Needed for the MVP

### R4 — Multi-source assertions + de-sourcing `[change code]`
- **Guidance:** §2 — a fact typically carries **multiple** sources; hovering reveals them; cross-
  spectrum facts arrive effectively **de-sourced** (the §6.3 headwind mitigation).
- **Repo today:** `shared/types/assertion.ts` gives each assertion a single `sourceId`.
- **Concrete change:** model an assertion as one canonical claim with a **set** of attributions;
  surface them on hover; compute the de-sourced presentation when coverage spans the spectrum. This
  also supplies the fact-level signal R1 needs.

### R5 — Openness dial `[build new]`
- **Guidance:** §2 — a dial controlling how far down the trust gradient facts surface, adjustable
  anytime, with gentle gamified encouragement and the "win arguments" framing. Acts on **source**
  trust first (§3).
- **Repo today:** only per-entity `TrustSlider.svelte`; no global openness control or gamification.
- **Concrete change:** build the dial as the primary surfacing control + the encouragement nudges.

### R6 — Onboarding source-trust elicitation `[change code]`
- **Guidance:** §2 — rate ingested sources (or a subset) at onboarding; the cheap non-empty seed.
- **Repo today:** `OnboardingView.svelte` exists with trust calibration — likely close, but verify
  it elicits **source** trust over the spread of ingested sources specifically.
- **Concrete change:** confirm/adjust onboarding to seed source-trust across the spectrum of seeded
  sources.

### R7 — Topic creation: lock down the UI, keep the backend `[change code]` `[docs only]`
- **Guidance:** §2 — **no user-created topics** in the MVP; this is a UI/scope cut, backend stays
  topic-general.
- **Repo today:** import/wiki flows allow arbitrary topics.
- **Concrete change:** remove/hide topic-creation UI; seed one (or a few) topics. Do **not** rip out
  topic-general backend support — it's needed and reused.

---

## 🟡 Docs / scope cleanup

### R8 — README vision & "people like me" framing `[docs only]`
- `README.md:3-7` ("personalized truth… incompatible worldviews coexist") and the headline
  "Finds 'People Like Me'" trust section conflict with the shared-substrate, fact-mediated,
  bridge-not-bubble direction. Rewrite the vision and retitle the algorithm section per R1/§6.2.

### R9 — Cost section `[docs only]`
- `README.md:560` (~$33/mo, AWS-dominated, 12 users) → replace with §7's fixed-floor / per-user-
  marginal model and lever list (LLM-cost-dominated, Batch API as the "spot" equivalent, BYO-key).

### R10 — Mark historical roadmap docs `[docs only]`
- `IMPLEMENTATION_SUMMARY.md`, `PHASE4_PLAN.md`, `NEXT_STEPS_HISTORICAL.md`, `PROJECT_REVIEW.md`,
  `docs/TRUST_ALGORITHM.md` track the old source-vector-similarity thesis. Add a pointer to
  `DESIGN_GUIDANCE.md` as current direction; rename to `*_HISTORICAL` where not already.

### R11 — Sybil / adversarial hardening is a deferral, not a correction `[defer]`
- Heavy investment in Sybil resistance, trust laundering, provenance/bot-vouching, 0.0-default-for-
  unknown (README, `IMPLEMENTATION_SUMMARY.md`). Not wrong — just not the MVP threat model (small,
  non-adversarial user set). Note as deferred; don't let it drive design now, don't delete it.

---

## Suggested sequencing

1. **Docs cleanup (cheap, reversible):** R8, R9, R10, R11 — make the repo *say* the right thing.
2. **MVP surfaces:** R4 (multi-source model), R5 (dial), R6 (onboarding check), R7 (topic lockdown).
3. **The thesis core:** R1 (fact-mediated, downward-first inference), R2 (instrument propagation
   direction), R3 (metrics layer). Do these together — R1/R2 produce the signals R3 must display,
   and none of the three is meaningful without the others.
