# Reconciliation: Repo vs. `DESIGN_GUIDANCE.md`

**Purpose:** `DESIGN_GUIDANCE.md` refines the project toward a Wikipedia-like, fully-attributed fact
layer with trust on every assertion and **metrics as the central deliverable**. This document maps
the *existing repo* against that guidance and says what actually needs to change.

**Framing (read this first):** the guidance is a **refinement, not a restart.** Most of the built
backend (assertion store, import pipeline, article construction/generation, onboarding, trust
plumbing) is reusable — including the article-construction pipeline, which the guidance elevates to
MVD-core (§6.5). The real work concentrates in three places: the **trust estimation mechanism**, a
**metrics layer that doesn't exist yet**, and a few **product surfaces** (openness dial, multi-source
facts, user fact contribution). Adversarial/Sybil hardening and multi-surface breadth are *deferrals*,
not corrections.

**Legend — severity:** 🔴 core to the thesis · 🟠 needed for the MVD · 🟡 docs/scope cleanup.
**Status tags:** `[change code]` · `[build new]` · `[defer]` · `[docs only]`.
**Note:** R-numbers are stable identifiers, not an ordering — R12/R13/R14 were added later and sit in
their severity sections, not at the end.

---

## 🔴 Core to the thesis

### R1 — Trust estimation: bootstrap unrated-source trust, then refine with fact-level signal `[change code]`
- **Guidance:** §6 — estimate a full per-user trust picture from sparse explicit trust. **At cold
  start there are no fact-level signals**, so trust must be estimated for **unrated sources** from the
  user's sparse explicit *source* ratings plus the assertion graph — otherwise no facts from unrated
  sources can ever surface. Per §6.2 this is done by (a) per-source estimation, (b) **source-overlap
  similarity** (sources that assert the same facts are similar, so trust flows between them), or
  (c) a combination. As users later react to facts (mostly **downward**, §6.1), the fact-mediated
  path refines the estimate. §8.2's caution is about a *different* thing — cross-user "people like me"
  similarity — not this within-user source estimation.
- **Repo today:** `backend/lib/trust/similarity.ts` + `propagation.ts` estimate a user's trust in a
  target via **user-user** similarity over source-trust vectors ("find people like me"). That (i)
  needs *other* users — a single brand-new user gets only entity defaults, with no within-user
  bootstrap from their own ratings + the assertion graph — and (ii) is exactly the cross-user shape
  §8.2 cautions about. There is no source-overlap estimation and no fact-mediated path.
- **Concrete change:**
  - Add **within-user cold-start estimation** of unrated-source trust from the user's explicit source
    ratings + the assertion graph (source-overlap similarity and/or per-source estimation), so a new
    single user still gets cross-source facts surfaced. This is the essential, logically-first piece.
  - Add the **fact-mediated refinement** for once fact-level reactions accrue — **downward-first**
    (knocking down a surfaced fact lowers calculated trust in sources backing it, and relates the
    user to others who rated it the same way); treat upward ratings as the rare bonus case.
  - Treat **user-user CF over source-trust vectors** as a *later* personalization layer governed by
    the §8.2 caution (point it at fact-level idiosyncrasy, not source-trust vectors) — not the
    cold-start mechanism, and not the headline. Retire "Finds 'People Like Me'" as the framing.

### R2 — Propagation direction must be instrumented, not assumed `[change code]` `[build new]`
- **Guidance:** §8.1 — the *direction* a fact-level action propagates is an **open design variable
  and part of the experiment**, not a settled law. Bridging actions (trust up off-tribe / down
  on-tribe) may need to propagate differently from reinforcing ones; the metrics decide.
- **Repo today:** propagation is symmetric, with no notion of tribe/valence/direction — so you
  *cannot currently see* which way it's pushing.
- **Concrete change:** make propagation direction a visible, configurable parameter and **instrument
  it** (log valence of each propagating action) so §7 metrics can show whether it's bridging or
  bubble-reinforcing. Do **not** hard-code a sign as if settled; the point is to measure it.

### R3 — Metrics layer ("the product") `[build new]`
- **Guidance:** §7 — instrumentation is the central deliverable: activity **proxies** (engagement,
  dial movement, cross-source facts surfaced, trust edges) kept *separate* from **ground truth**
  (periodic out-group-affect / feeling-thermometer), with a dashboard that makes the **proxies-up /
  thermometer-down divergence** loud (§7.2), plus the self-report caveat (§7.3).
- **Repo today:** none of this exists. Only CloudWatch infra metrics (`README.md:552`).
- **Concrete change:** build it — affect capture, proxy capture, the divergence dashboard. This is
  the most under-built, highest-priority piece per §7.

### R12 — Pricing user-authored assertions `[build new]`
- **Guidance:** §6.3 — a peer-authored claim must be given an estimated trust value for every *other*
  user. Its author has no corpus and often no ratings, so §6.2's source-overlap machinery has little
  to work with. Three paths: (a) corroboration overlap through the *fact*, (b) accrued trust in the
  author once they have a history (downward-first, plausibly topic-scoped), (c) user-user similarity
  over source-trust vectors — which is §8.2's suspect shape, and the only one that covers the case
  that matters (novel claim, new contributor).
- **Repo today:** the *storage* exists — `shared/types/assertion.ts` has `sourceType: "user"` and
  `authorUserId`, and `backend/functions/assertion-crud` accepts a POST. Nothing **prices** these:
  the trust engine treats sources as the trust-bearing entity and has no author-as-entity estimation,
  no corroboration-overlap path, and no per-assertion record of *which* path produced a value.
- **Concrete change:** implement (a) and (b); implement (c) deliberately weak and **logged**. Record
  on every peer-authored assertion which path priced it, so R3's dashboard can compare bridging vs.
  bubbling by path. Per §6.3 and §8.2 this is an instrumented design variable — do not hard-code a
  belief about which path is right.

---

## 🟠 Needed for the MVD

### R13 — Fact-contribution surface `[change code]` `[build new]`
- **Guidance:** §5 — users add facts to the seeded topic; the MVD tests the *experience* of
  contributing, not just the estimation problem behind it. Topic creation stays cut (R7).
- **Repo today:** backend create path exists (see R12); no frontend affordance — `frontend/src/lib/
  components` has trust/content/groups but no compose surface. Contribution is also not distinguished
  in the UI from ingested facts.
- **Concrete change:** add the compose UI, attribute the assertion to its author, and show authorship
  in the hover/attribution treatment R4 builds. Decide and document what a contributor sees about
  their fact's reach (this is itself a §7 proxy and a §8.4 risk — showing "your fact reached N people"
  could turn contribution into a broadcast game).

### R4 — Multi-source assertions + de-sourcing `[change code]`
- **Guidance:** §1 — a fact typically carries **multiple** sources; hovering reveals them; cross-
  spectrum facts arrive effectively **de-sourced** (the §8.3 headwind mitigation).
- **Repo today:** `shared/types/assertion.ts` gives each assertion a single `sourceId`.
- **Concrete change:** model an assertion as one canonical claim with a **set** of attributions;
  surface them on hover; compute the de-sourced presentation when coverage spans the spectrum. This
  also supplies the fact-level signal R1 needs.

### R5 — Openness dial `[build new]`
- **Guidance:** §1 / §5 — a dial controlling how far down the trust gradient facts surface,
  adjustable anytime, with gentle gamified encouragement and the "win arguments" framing. Acts on
  **source** trust first (§6).
- **Repo today:** only per-entity `TrustSlider.svelte`; no global openness control or gamification.
- **Concrete change:** build the dial as the primary surfacing control + the encouragement nudges.

### R6 — Onboarding source-trust elicitation `[change code]`
- **Guidance:** §1 / §5 — rate ingested sources (or a subset) at onboarding; the cheap non-empty
  seed.
- **Repo today:** `OnboardingView.svelte` exists with trust calibration — likely close, but verify
  it elicits **source** trust over the spread of ingested sources specifically.
- **Concrete change:** confirm/adjust onboarding to seed source-trust across the spectrum of seeded
  sources.

### R7 — Topic creation: lock down the UI, keep the backend `[change code]` `[docs only]`
- **Guidance:** §5 — **no user-created topics** in the MVD; this is a UI/scope cut, backend stays
  topic-general.
- **Repo today:** import/wiki flows allow arbitrary topics.
- **Concrete change:** remove/hide topic-creation UI; seed one (or a few) topics. Do **not** rip out
  topic-general backend support — it's needed and reused.

### R14 — Composers as trust targets `[change code]` `[build new]`
- **Guidance:** §6.5 / §6.5.1 — the composer's ordering, proportion and especially its **connectives**
  manufacture relational claims that no assertion contains and that the trust machinery never filters.
  "Hidden by intent" is withdrawn: composers become **named, directly-rated entities**, with at least
  two on the list↔essay axis so the voice has a **control condition** (§6.5.1). Selection by declared
  stance, not by two-versions-pick-one (§6.5.2).
- **Repo today:** one composer, hard-coded. `backend/lib/llm/prompts.ts:57` (`GENERATION_SYSTEM_PROMPT`)
  is a single fixed voice; `:65` and `:77` constrain it to "arrange, transition, structure — NO new
  factual content," which is a **hallucination guard that explicitly licenses the voice operations**
  §6.5 is worried about. `:71` ("prioritize high-trust assertions in the main narrative", low-trust
  gets "brief mention for balance") is an editorial stance baked into a prompt string. No composer
  entity, no rating, no record of which composer produced an article.
- **Concrete change:** parameterise the composer — at minimum a **conservative** variant (parataxis,
  chronological, equal proportion, conflicts foregrounded) and the existing **fluent** one; make it a
  rateable entity; **stamp every generated article with the composer and model version** so R3 can
  segment outcomes by voice. Do *not* build the preference-comparison chooser (§6.5.2, §8.5).
- **Cross-cutting:** §9's model-routing lever is now coupled to this — pin and version the composition
  model, since swapping it silently changes the voice and invalidates comparisons across the change.

---

## 🟡 Docs / scope cleanup

### R8 — README vision & "people like me" framing `[docs only]`
- `README.md:3-7` ("personalized truth… incompatible worldviews coexist") and the headline
  "Finds 'People Like Me'" trust section conflict with the shared-substrate, fact-mediated,
  bridge-not-bubble direction. Rewrite the vision and retitle the algorithm section per R1/§8.2.

### R9 — Cost section `[docs only]`
- `README.md:560` (~$33/mo, AWS-dominated, 12 users) → replace with §9's fixed-floor / per-user-
  marginal model and lever list (LLM-cost-dominated, Batch API as the "spot" equivalent, BYO-key).

### R10 — Mark historical roadmap docs `[docs only]`
- `IMPLEMENTATION_SUMMARY.md`, `PHASE4_PLAN.md`, `NEXT_STEPS_HISTORICAL.md`, `PROJECT_REVIEW.md`,
  `docs/TRUST_ALGORITHM.md` track the old source-vector-similarity thesis. Add a pointer to
  `DESIGN_GUIDANCE.md` as current direction; rename to `*_HISTORICAL` where not already.

### R11 — Sybil / adversarial hardening is a deferral, not a correction `[defer]`
- Heavy investment in Sybil resistance, trust laundering, provenance/bot-vouching, 0.0-default-for-
  unknown (README, `IMPLEMENTATION_SUMMARY.md`). Not wrong — just not the MVD threat model (small,
  non-adversarial user set). Note as deferred; don't let it drive design now, don't delete it.
- **Amended by R13:** fact contribution creates the abuse surface this work was aimed at, so the
  deferral now rests on an **explicit assumption about the user set** (§5) rather than on there being
  nothing to attack. Still deferred — but state the assumption where the deferral is recorded, and
  keep the existing hardening code rather than deleting it, since it is the thing that gets turned on
  if the assumption stops holding.

---

## Suggested sequencing

1. **Docs cleanup (cheap, reversible):** R8, R9, R10, R11 — make the repo *say* the right thing.
2. **MVD surfaces:** R4 (multi-source model), R5 (dial), R6 (onboarding check), R7 (topic lockdown),
   R13 (contribution UI), R14 (composers). R4 before R13 — the attribution treatment R4 builds is
   where authorship gets displayed. R14's *stamping* half (record composer + model version on every
   article) should land early and cheaply, before much prose exists to be uncomparable.
3. **The thesis core:** R1 (re-keyed, downward-first estimation), R2 (instrument propagation
   direction), R12 (pricing peer-authored assertions), R3 (metrics layer). Do these together — R1,
   R2 and R12 produce the signals R3 must display, and none of them is meaningful without the others.
   R12 depends on R1: it reuses the source-overlap machinery for its corroboration path and the
   author-as-entity path is the fact-mediated refinement keyed on a person.
