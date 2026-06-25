# Nudge — Design Guidance

**Purpose:** Guidance for future work (including future Claude Code sessions) on what Nudge is
trying to be and how to build toward it. This is a refinement of the existing project's direction,
not a restart. It sharpens the focus toward a Wikipedia-like, fully-attributed fact layer with
trust attached to every assertion, and it makes the **instrumentation the central deliverable**.

> **How to read this doc.** Sections 1–5 are the builder's settled intent. Section 6 ("Cautions
> raised in review") is a set of *unvalidated* concerns from a devil's-advocate discussion — things
> to **test and watch for**, not laws to obey. Several were raised by an AI reviewer and are not
> conclusions the builder has accepted; where they're recorded here it's so the metrics can be
> designed to catch them, not so they can be enshrined as rules. Don't treat §6 as settled.

---

## 1. The thesis and the experiment

The same fine-grained trust signal that a recommender could use to **increase** polarization could
instead be used to **decrease** it. Nudge is a platform that is genuinely dual-use in this way. The
thesis is not "this reduces polarization" — it's:

> **A system that can facilitate polarization can also be incentivized to reduce it — and whether
> it actually does is an empirical question the metrics are built to answer.**

Concretely, the depolarization target for the MVP is narrow and measurable: **can gentle incentives
get a user to open their trust threshold far enough to take in news sources they wouldn't ordinarily
consider — and does doing so move out-group affect in the right direction rather than the wrong one.**

This is *not* the intervention the depolarization-backfire studies tested. Those force-fed random
opposing views from out-group messengers and triggered reactance. Nudge instead routes content
through what a user *already* trusts, and surfaces opposing material the user is *most likely to
accept* — delivered as **attributable endorsement** ("sources you trust also report this"), not as a
system edict. That's a different mechanism with a more favorable prior; it is still unproven, which
is the entire reason the metrics come first.

The risk that this makes things *worse* is real and is taken seriously (see §6). It is not dismissed
— it is the reason the project is metrics-first rather than ship-first.

---

## 2. What Nudge is

A centralized, **fully-attributed fact database** for one (or a few) broad topics, with **trust
attached to every assertion**, presented through a Wikipedia-like surface. Not a content generator
and not a source of record — a *smart aggregator of the sources the user already trusts.*

Settled design elements:

- **A shared canonical page per topic.** Users contribute by *adding facts*, never by creating new
  articles — like Wikipedia's "edit to add, don't fork." This keeps everyone on one shared substrate
  per topic instead of forking into parallel articles.
- **No user-created topics (MVP).** Topics are seeded. This is primarily a **UI/scope cut** — the
  backend is topic-general (it has to be, to support the seed topic[s]), so disallowing topic
  creation removes UI surface without removing backend capability.
- **Every assertion is fully attributed**, and a fact typically carries **multiple sources** (it's
  something most sources reported). Hovering a fact reveals its sources. A fact reported across the
  spectrum effectively arrives *de-sourced*, which blunts the source-label reflex (§6) for exactly
  the facts most likely to cross tribal lines.
- **Source-trust is elicited at onboarding.** The user rates how much they trust each ingested
  source (or a subset). This is the cheap seed that makes the system non-empty on day one, and at
  first the openness dial acts on **source** trust.
- **The openness dial.** The user sets, and can change at any moment, how far down their trust
  gradient they want to see. Facts surface when their computed trust clears the dial. Gentle,
  gamified encouragement nudges the dial up. Framing: **"understand the other side well enough to
  win arguments,"** not "be open-minded" (the latter is the request that triggers reactance).
- **The synthetic voice is hidden, by intent.** What's stored are facts, trust scores, and editorial
  suggestions that improve the readability of generated prose. The Wikipedia-like article is
  generated; its voice (ordering, emphasis, smoothing) is deliberately not foregrounded. This is a
  conscious choice, with eyes open to the risk in §6.

---

## 3. The trust model

Two kinds of trust, very different in frequency:

- **Source-trust** — set explicitly at onboarding, and the primary thing the dial acts on early. The
  most tribally-sorted signal in the system (see the CF caution in §6.2).
- **Fact-level trust** — the rare, high-signal interaction. It fires when a user breaks from what
  their trusted sources imply about a *specific* contested fact. Common-case reading needs no
  per-fact rating.

### 3.1 Fact-level trust is mostly *downward* — design for that

In practice, a user adjusts a fact's trust when it shows up in their feed and they **don't believe
it** — they push it *below* the dial and it disappears. This is almost always a **reduction** from
the calculated value.

Upward adjustments are rare, and not because users wouldn't make them — because the facts that
deserve them sit **below the threshold, unseen.** There is no reliable way to surface "everything you
might be rating too low." The openness dial is the only partial remedy (open it and some hidden facts
appear), but even then the dominant fact-level signal is **negative.**

Implication: the inference machinery must run primarily on downward signal. Treat an upward
fact-rating as the rare bonus case, not the mechanism's backbone.

### 3.2 Calculated trust for unrated sources

For sources a user has neither trusted nor distrusted, a trust level is **calculated** per user. The
seed intuition (in the builder's words): when a user explicitly sets trust on an *assertion* that
(a) surfaced because of sources they already trust and (b) is **also supported by an unrated
source**, that's evidence about the unrated source — value-overlap that should move the calculated
trust. Given §3.1, the realistic firing is the **downward** version: a user knocking down a surfaced
fact that an unrated source supports is evidence to *lower* calculated trust in that source (and to
relate the user to others who rated that fact the same way).

This fact-mediated path — from explicit *assertion* trust to inferred *source* trust — is the
intended bridge between the cheap onboarding seed and a richer per-user trust picture. It is distinct
from (and should not be replaced by) similarity computed directly over source-trust vectors (§6.2).

> **Note on the current codebase:** the implemented trust engine infers trust via cosine similarity
> over users' *source-trust* vectors ("find people like me"). That is the opposite of the
> fact-mediated, downward-signal mechanism described here, and it's the design the §6.2 caution warns
> about. Reconciling the engine with this section is real work, not a doc edit — see the cautions
> before changing it.

---

## 4. Metrics are the product

Because every load-bearing claim is empirical, the **instrumentation is the central deliverable**,
not a supporting feature. The trust-routing is the hypothesis; the metrics are what distinguish a
depolarization machine from a polarization machine that produces identical-looking activity.

### 4.1 Separate ground truth from activity proxies
- **Proxies (cheap, and dangerous):** engagement, dial movement, cross-source facts surfaced, trust
  edges created. **All can rise while the real target stays flat or reverses.**
- **Ground truth:** out-group affect, measured periodically (a feeling-thermometer delta is the
  standard instrument). This is the metric that would catch a system that's hardening people while
  its proxies look healthy.

### 4.2 The divergence to make loud
The signal that matters most is **proxies up *and* thermometer down, simultaneously.** If the
apparatus can't surface that specific contradiction, it will confirm whatever you hoped going in.
Build the dashboards to make this divergence loud, not buried.

### 4.3 Measurement caveat
An in-app feeling-thermometer is self-report collected *inside the system doing the nudging* — a
compromised measurement; people may report what the framing primes. At small N there's no clean fix.
Treat the early signal as **directional, not proof**; real validation eventually needs a measurement
that doesn't run through the same interface doing the persuading.

---

## 5. MVP scope

The smallest build that can ask the real question: **can gentle incentives open a user's threshold to
sources they'd otherwise ignore, and which way does out-group affect move when they do.**

**Needed:**
- A seeded, attributed fact database for one (or a few) seeded topics, sources spanning the spectrum.
- A small set of users (a couple dozen is enough to see whether the mechanism fires).
- Onboarding source-trust elicitation.
- The openness dial, with gentle gamified encouragement.
- Calculated source-trust for unrated sources, driven primarily by downward fact-level signal (§3).
- **The metrics layer (§4)** — proxies *and* the out-group-affect ground truth, with the divergence
  surfaced. This is the part most likely to be under-built and matters most.

**Deliberately minimal / deferred (not deleted):** topic creation UI; heavy collaborative filtering;
adversarial/Sybil hardening (not the early threat model). Prose generation stays, but its quality bar
is "readable," not "the product."

---

## 6. Cautions raised in review — UNVALIDATED, to test not obey

These came out of a devil's-advocate discussion. They are **plausible risks, not accepted
conclusions.** Record them so the design and metrics can account for them; do not treat them as
settled rules. In particular, none of these is a reason *not* to run the experiment — testing whether
they bite is the point.

### 6.1 Propagation direction (the sign risk)
When a fact-level action propagates calculated trust toward other users, the *direction* matters. The
concern: the most common action (§3.1) is rejecting a fact that "reads as false," which often means a
fact that cut against the user's priors — and propagating *shared rejection of cross-cutting facts*
could reinforce bubbles through the very gesture meant to bridge them. The hypothesis worth testing is
that bridging actions (trusting *up* an off-tribe fact, trusting *down* an on-tribe one) should
propagate differently from reinforcing ones. **Status:** an open design variable and part of the
experiment — *not* a law the builder has adopted. The metrics (§4) are what tell you which direction
is actually happening; instrument propagation so you can see it rather than assuming the sign.

### 6.2 Don't let collaborative filtering key on source-trust vectors
Source-trust is the most tribally-sorted signal in the system. Similarity computed over source-trust
vectors clusters users by tribe and predicts *inward* — a personalization step that would turn the
bridge into a bubble. The fact-mediated path in §3.2 (idiosyncratic agreement/disagreement on
*specific* facts) is the cross-cutting signal worth weighting instead, sparse as it is early.
**Status:** a caution about *how* to build CF if/when it comes online; the current engine does the
thing this warns against (see §3.2 note).

### 6.3 Merit-versus-label headwind
Will a user judge a cross-source fact on its **content**, or bounce off the **source label**? The
literature documents real source effects on credibility, so this carries a prior against us. The
dial, gamification, "win arguments" frame, and multi-source de-sourcing (§2) all exist to buy a few
degrees of merit-judgment against that gravity. This reframes part of the thesis as a **rate
problem**: cross-cutting trust accrues only as fast as users overcome the label effect. **Status:** a
measurable headwind to watch, not a blocker.

### 6.4 Instrument effect
Making latent trust **explicit** might harden some currently-moderate users — turning soft priors
into stated positions the system then optimizes around. This is the failure mode most worth watching
because it's the one that would make a shipped product worse than nothing. **Status:** precisely what
the §4 metrics must be able to detect (it shows up as warmth dropping while engagement/dial-use
climb). Watching for it is *why* the project is metrics-first — it is not an argument against trying.

---

## 7. Cost & infrastructure guidance

Past a handful of users this is an **LLM-cost system, not an infrastructure-cost system.** AWS
plumbing is a rounding error next to tokens.

The single-topic-ish constraint splits costs in two:
- **Fixed floor (~$12–15/mo, independent of user count):** ingestion + assertion extraction is
  *shared* — extract each item's assertions once, regardless of reader count — plus frontend/CDN and
  tiny assertion storage. Runs even at zero users because the topic must stay fresh (which is why
  single-user economics are poor).
- **Per-user marginal:** dominated by per-user LLM work (article generation, chat). Swings ~4–5x on
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
4. **Regenerate on change, not on view** — cache articles; regenerate only when a trusted new
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
