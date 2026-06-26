# Nudge — Design Guidance

## Purpose of this document

This is the orientation and design direction for Nudge. It explains **what Nudge is and why**, the
**eventual system**, the **first demo (MVD)** that tests its riskiest assumptions, and the
**cautions** to watch while building. It is the authoritative statement of *direction*.

It is **not** an implementation spec and **not** a description of the current code. For the code as
built, see [`README.md`](./README.md); for the gap between the code and this direction, see
[`RECONCILIATION.md`](./RECONCILIATION.md). Where the README's framing and this document disagree,
this document is authoritative.

> Conventions: **"Nudge"** refers to the eventual system. **"the MVD"** (minimum viable demo) refers
> to the first build, which tests the core bet. Most of the backend is shared between them; the MVD
> is limited mainly in its UI and in which contribution features it exposes.

---

## 1. What Nudge is

Nudge is a system — we know of **no precedent for it** — for **reducing polarization** on contested
topics. It works like this:

- It **ingests facts** about a topic from sources across the political/ideological spectrum into a
  **single, shared, fully-attributed fact database.** Every assertion records who said it, and a
  given fact is typically reported by several sources.
- **Trust is attached to every assertion**, and to the sources, people, and organizations behind it.
- Each user is shown a **Wikipedia-like entry** on the topic, **constructed from the facts that clear
  that user's personal trust threshold.**
- Users express trust **sparsely** — they rate some sources, and occasionally reject a specific fact
  they don't believe. The system **estimates the rest** of their trust from those sparse signals.
- An **openness dial** lets the user control how far down their own trust gradient they're willing to
  see, with gentle encouragement to widen it.

The core idea: instead of force-feeding people opposing views, route credible cross-cutting facts
through **the sources they already trust**, and let them open up at their own pace. The bet is that
information arriving as *"sources you trust also report this"* lands differently than the same
information pushed at someone by a system or an out-group messenger.

---

## 2. Background: why "just show people the other side" backfires

Reducing polarization by exposing people to opposing views sounds obvious, but the evidence is not
encouraging, and this is not widely known, so it's worth stating.

The cautionary result (Bail et al., 2018 is the well-known example): paying partisan social-media
users to follow a bot that surfaced opposing-party content made them **more** entrenched, not less.
The leading explanation is **identity threat / reactance** — being force-fed out-group views,
especially from out-group messengers, triggers defensive entrenchment. The *messenger* matters as
much as the message.

Nudge is deliberately **not** that intervention. It routes cross-cutting facts through sources the
user has *already* endorsed (attributable endorsement), surfaces only as far as the user chooses to
open the dial, and frames the act as *"understand the other side well enough to win arguments"* — a
self-interested motive — rather than *"be open-minded,"* which is the prosocial request that provokes
reactance. There's a supporting literature here too (the "unlikely validator" / trusted-messenger
effect): the same claim persuades when it arrives through a source the recipient respects.

This makes Nudge's approach a **genuinely different intervention** from the one that backfired — but
it is **untested.** That is the whole reason the metrics (§7) come first.

---

## 3. The goal and the central risk

**Primary goal:** reduce polarization. This is the point of Nudge, not a side effect. The broader
experiment is simply *whether a system like this — which has no precedent — works at all*, with
depolarization as the thing it's built to achieve.

**The central risk:** the very same mechanics that can build a bridge can also deepen a bubble. A
platform that surfaces and propagates fine-grained trust can **facilitate both polarization and
bridging at once.** So the highest-order open question is:

> **Does Nudge, on balance, do more good than harm?**

That question cannot be answered by reasoning — only by measurement. It is why the **instrumentation
is the central deliverable** (§7), and why the MVD exists. Other, more specific risks (the
source-label headwind, the chance that making trust explicit hardens moderates, getting the direction
of trust propagation wrong) are catalogued in §8 as things to **test**, not settled conclusions.

---

## 4. The eventual system (Nudge)

The full vision, for context:

- **Many topics**, each a single shared page. Users **contribute by adding facts** to an existing
  topic — Wikipedia's "edit to add, don't fork" — so the community converges on one shared substrate
  per topic rather than splitting into competing articles.
- **Trust over sources, facts, people, organizations, and groups**, estimated per user from sparse
  input (§6).
- **Generated, readable, Wikipedia-like prose** per user, constructed from their trusted fact set.
- The openness dial, gamified encouragement, and the "win arguments" framing as standing features.
- Eventually, validation that doesn't run entirely through the app's own self-report (§7.3).

---

## 5. The first demo (the MVD)

The MVD is **not a stripped-down sketch.** It is **most of the backend with a deliberately limited
UI** — a **testbed aimed straight at Nudge's hardest, highest-risk problems**: estimating trust from
sparse signal, constructing trust-filtered entries, surfacing cross-cutting facts, and measuring
whether opening up actually reduces polarization.

**The MVD includes (the hard parts):**
- Ingestion of attributed facts for one (or a few) **seeded** topics, sources spanning the spectrum.
- The trust-estimation model (§6) and per-user trust filtering.
- **Construction of Wikipedia-like entries** from the facts that clear a user's trust threshold,
  including the hidden synthetic voice (§6.4).
- The openness dial with gentle encouragement.
- **The metrics layer (§7)** — the actual deliverable.

**The MVD limits (mostly UI / contribution scope, not core machinery):**
- **No user-created topics** — purely a UI/scope cut; the backend stays topic-general.
- **Users do not add facts** — they only express trust (rate sources at onboarding; reject surfaced
  facts they disbelieve). Fact contribution is an eventual-Nudge feature.
- Trust targets may be narrower at first (sources and facts) than the eventual people/orgs/groups.
- Small user set; no distribution work; adversarial/Sybil hardening deferred (not the early threat
  model).

---

## 6. The trust model (shared by Nudge and the MVD)

The core problem is the same everywhere in Nudge: **from sparse explicit trust, estimate the trust a
user would assign to everything else.** A user rates a handful of sources and rejects the odd fact;
the system must fill in trust for the unrated sources, the unseen facts, and (later) people and
organizations. Some variant of a **diffusion-style model** is the likely shape — propagating known
trust values through relationships among users, sources, and facts to estimate the unknown ones. (The
exact method is open; the builder is not committed to specifics.)

### 6.1 Trust adjustments are mostly *downward*
In practice a user adjusts a fact's trust when it surfaces and they **don't believe it** — pushing it
below the dial so it disappears. This is almost always a **reduction** from the estimated value.
*Upward* adjustments are rare, not because users wouldn't make them, but because the facts that
deserve them sit **below the threshold, unseen**, and there's no reliable way to surface "everything
you might be underrating." The openness dial is the only partial remedy. So the estimation machinery
must run primarily on **downward** signal; treat upward fact-ratings as a rare bonus.

### 6.2 Calculated trust for unrated sources
For a source the user hasn't rated, trust is estimated. The useful signal is **fact-mediated**: when
a user reacts to an *assertion* that an unrated source also supports, that's evidence about the
source. Given §6.1, the realistic firing is downward — knocking down a surfaced fact an unrated
source backs is evidence to *lower* estimated trust in that source, and relates the user to others
who rated that fact the same way.

### 6.3 A note on the current code (and a caution it triggers)
The existing engine already implements a **similarity-based diffusion** — the right *shape*. But it
keys similarity on users' **source-trust vectors** ("find people like me"). Source-trust is the most
tribally-sorted signal in the system, so similarity built on it clusters users by tribe and predicts
*inward* — which would make the personalization a bubble rather than a bridge (see §8.2). The
fact-mediated, idiosyncratic signal of §6.2 is the cross-cutting one worth weighting instead.
Reconciling the engine with this is real code work, not a doc edit.

### 6.4 Article construction and the "hidden synthetic voice"
Both Nudge and the MVD **construct readable, Wikipedia-like entries** from a user's trusted facts —
this is generated prose, not a raw fact list. Generated prose unavoidably has a **voice**: ordering,
emphasis, phrasing, what-leads-to-what are rhetorical choices even when no human made them, and a
readability layer tunes them. *"Hidden by intent"* means Nudge presents these entries in a plain,
encyclopedic style that **does not foreground that the text is synthesized** — it wears Wikipedia's
voiceless appearance even though a voice is present. This is a deliberate, eyes-open choice. Its risk
(see §8): a neutral-looking text can steer without the reader noticing, and two users get different
fluent, authoritative entries on "the same" topic.

### 6.5 Shared substrate, personalized view
There is **one shared topic and one shared fact database** — users cannot fork a topic into competing
articles. But each user's **rendered entry differs**: different facts clear different thresholds, in
different order. So "shared" describes the substrate and the topic's identity, **not** the experience.
This is deliberate, and it is itself a risk: Wikipedia's trust comes partly from everyone seeing the
*same* words, and personalizing the view gives that up. Worth watching in the metrics.

---

## 7. Metrics are the product

Because every load-bearing claim is empirical, the **instrumentation is the central deliverable.** The
trust-routing is the hypothesis; the metrics are what distinguish a depolarization machine from a
polarization machine that produces identical-looking activity.

### 7.1 Separate ground truth from activity proxies
- **Proxies (cheap, and dangerous):** engagement, dial movement, cross-source facts surfaced, trust
  edges created. **All can rise while the real target stays flat or reverses.**
- **Ground truth:** out-group affect, measured periodically (a feeling-thermometer delta is the
  standard instrument). This catches a system hardening people while its proxies look healthy.

### 7.2 The divergence to make loud
The signal that matters most is **proxies up *and* thermometer down, simultaneously.** If the
apparatus can't surface that contradiction, it will confirm whatever you hoped going in. Build the
dashboards to make this divergence loud, not buried.

### 7.3 Measurement caveat
An in-app feeling-thermometer is self-report collected *inside the system doing the nudging* — people
may report what the framing primes. Treat the early signal as **directional, not proof**; real
validation eventually needs a measurement that doesn't run through the same interface doing the
persuading.

---

## 8. Cautions raised in review — UNVALIDATED, to test not obey

These came out of a devil's-advocate discussion. They are **plausible risks, not accepted
conclusions**, and none is a reason not to run the experiment — testing whether they bite is the
point. Record them so the design and metrics can account for them; don't treat them as rules.

### 8.1 Propagation direction (the sign risk)
When a fact-level action propagates estimated trust toward other users, *direction* matters. The most
common action (§6.1) is rejecting a fact that "reads as false," which often means a fact that cut
against the user's priors — propagating *shared rejection of cross-cutting facts* could reinforce
bubbles through the very gesture meant to bridge them. **Status:** an open design variable and part of
the experiment, not a law. Instrument propagation so the metrics (§7) can show which way it's actually
pushing, rather than assuming the sign.

### 8.2 Don't key trust estimation on source-trust vectors
Source-trust is the most tribally-sorted signal, so similarity computed over it clusters by tribe and
predicts inward — turning the bridge into a bubble. Weight estimation toward fact-level idiosyncrasy
(§6.2) instead. **Status:** a caution about *how* to build the estimator; the current engine does the
thing this warns against (§6.3).

### 8.3 Merit-versus-label headwind
Will a user judge a cross-source fact on its **content**, or bounce off the **source label**? Source
effects on credibility are real and documented, so this carries a prior against us. The dial, the
framing, and multi-source de-sourcing (a fact reported across the spectrum arrives effectively
de-sourced) exist to buy a few degrees of merit-judgment against that gravity. **Status:** a
measurable headwind, not a blocker.

### 8.4 Instrument effect
Making latent trust **explicit** might harden some currently-moderate users — turning soft priors
into stated positions the system then optimizes around. This is the failure mode that would make a
shipped product worse than nothing, and it shows up as warmth dropping while engagement and dial-use
climb. **Status:** precisely what the §7 metrics must detect. Watching for it is *why* the project is
metrics-first — not an argument against trying.

---

## 9. Cost & infrastructure guidance

Past a handful of users this is an **LLM-cost system, not an infrastructure-cost system.** AWS
plumbing is a rounding error next to tokens.

The single-topic-ish constraint splits costs in two:
- **Fixed floor (~$12–15/mo, independent of user count):** ingestion + assertion extraction is
  *shared* — extract each item's assertions once, regardless of reader count — plus frontend/CDN and
  tiny assertion storage. Runs even at zero users because the topic must stay fresh (which is why
  single-user economics are poor).
- **Per-user marginal:** dominated by per-user LLM work (entry construction, chat). Swings ~4–5x on
  model choice and caching/regeneration discipline.

**Levers, in rough order of impact:**
1. **Model routing** — cheapest model that clears the bar. Haiku-class for extraction/chat/
   classification; reserve Sonnet for reading-quality prose; Opus essentially never. Biggest lever.
2. **Open-source LLMs for the mechanical layers** — extraction, embeddings (never pay a frontier
   model for embeddings), dedup/matching, classification, via a pay-per-token provider. At
   single-topic volume the immediate dollar win is small; the real value is vendor independence and
   pushing Claude-dependency toward near-zero.
3. **Prompt-cache the assertion set** — one topic's assertions are a large, stable prefix; caching
   cuts the input side ~90%.
4. **Regenerate on change, not on view** — cache entries; regenerate only when a trusted new
   assertion arrives or the user edits trust.
5. **Batch API for background ingestion/extraction** — 50% off, latency-tolerant. This (not EC2
   spot) is the real "interruptible capacity" win, because the cost is tokens, not the compute.
6. **Diff-based regeneration** — regenerate only the affected section; output tokens are the costly
   side.
7. **Keep extraction shared, never per-user** — personalizing extraction converts the fixed floor
   into a per-user cost and inverts the whole model.
8. **BYO-key** — users supply their own API key, billing generation/chat to them; drops infra
   toward ~$100/mo at 1000 users. Steep adoption tax — viable for a technical beta, a non-starter
   for consumer scale.

Spot instances are the right instinct aimed at the wrong layer: the architecture is serverless and
the cost is tokens, so the Batch API is the token-level equivalent of spot.
