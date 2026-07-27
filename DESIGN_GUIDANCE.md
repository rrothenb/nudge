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
> is limited mainly in its UI and in topic scope, not in core machinery.

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
  per topic rather than splitting into competing articles. (The MVD tests this loop too, on one
  topic — see §5.)
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
  including the hidden synthetic voice (§6.5).
- **User-authored assertions** — any user can add a fact to the seeded topic, and the system
  estimates, for every *other* user, how likely they are to trust it (§6.3). Both halves are in
  scope: the **experience** of contributing, and the **estimation problem** a peer-authored claim
  creates.
- The openness dial with gentle encouragement.
- **The metrics layer (§7)** — the actual deliverable.

**The MVD limits (mostly UI / topic scope, not core machinery):**
- **No user-created topics** — purely a UI/scope cut; the backend stays topic-general. Users add
  *facts* to the seeded topic; they don't open new ones.
- Trust targets are **sources, facts, and users-as-authors**; organizations and groups are deferred.
  (User-authored assertions force people into the MVD's trust targets — see §6.3.)
- Small user set; no distribution work; adversarial/Sybil hardening deferred (not the early threat
  model). Note that fact contribution is the obvious abuse vector, so this deferral is now an
  **explicit assumption about the user set** — a small, known, non-adversarial group — rather than
  the absence of an attack surface.

**Why fact contribution is in scope.** It was previously cut as an eventual-Nudge feature. It comes
back because it is not a UI nicety: it is the one place where the people being measured *write* the
substrate, and it creates an estimation problem the ingestion-only design never poses (§6.3). It is
also the sharpest available test of §2's trusted-messenger claim — a peer is a very different
messenger from a publication, and the MVD can measure whether a cross-cutting fact lands better or
worse coming from one (§7.1).

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
For a source the user hasn't rated, trust **must** be estimated — otherwise none of its facts can
ever surface, and there is nothing cross-cutting to react to. **At cold start there are no fact-level
signals yet**, so the only material is the user's sparse explicit *source* ratings plus the assertion
graph. Estimate from that by:
- **(a) per-source estimation** — compute a trust value for each unrated source; or
- **(b) source-overlap similarity** — sources that assert the *same facts* are similar, so trust
  flows from rated to unrated sources through shared assertions (estimable at the source level or
  directly at the fact level); or
- **(c) a combination** of the two.

Once the user starts **reacting to facts**, a second, **fact-mediated** signal refines the estimate.
Given §6.1 its realistic firing is downward: knocking down a surfaced fact an unrated source backs is
evidence to *lower* estimated trust in that source, and relates the user to others who rated that
fact the same way.

### 6.3 Trust in user-authored assertions
Any user can add a fact, so the system must estimate — for every *other* user — how likely they are
to trust a claim written by a peer. This is **not** the §6.2 problem with a different label. An
ingested source arrives with a **corpus**: it has asserted many things, it overlaps with other
sources, and the user may have rated it directly at onboarding. A user-authored assertion arrives
from a person who may have written **exactly one thing** and whom **nobody has rated**. The entity is
not merely unrated, it is *new* — so source-overlap similarity has almost nothing to chew on.

The signals actually available, in descending order of how well-behaved they are:
- **(a) Corroboration overlap.** If the claim restates or corroborates something ingested sources
  already assert, it inherits estimated trust through the *fact*, via the same §6.2(b) machinery —
  the assertion, not the author, is the bridge. This is the clean case, and it works precisely when
  the claim is **not novel**.
- **(b) Accrued trust in the author.** Once a user has authored several assertions and others have
  reacted, the author becomes a trust target like any source — downward-first per §6.1. This is the
  fact-mediated path keyed on a *person*. It cannot price anyone's **first** assertion, and trust in
  an author is plausibly **topic- or claim-scoped** rather than global.
- **(c) The author's own source ratings.** The tempting bootstrap: *this author trusts the sources
  you trust, so you'd probably trust them.* Note what this is — **user-user similarity computed over
  source-trust vectors**, exactly the shape §8.2 cautions against. So the most readily available
  cold-start signal for peer-authored facts is the one most likely to sort users by tribe and route
  peer claims *inward*.

That collision is the interesting part and should not be resolved by fiat. (a) and (b) are safe but
cover the least interesting cases — the unoriginal claim and the established author. (c) covers the
case we actually care about (a novel claim from a new contributor) and is the one under suspicion.
**Treat this as an instrumented design variable, like §8.1:** implement it, log which path priced
each peer-authored assertion, and let §7's metrics show whether peer contribution bridges or
bubbles. A defensible default is to lean on (a)/(b) where they have signal and let (c) act only
weakly and visibly — but that is a starting position to measure, not a finding.

Two consequences worth naming: a peer-authored fact **cannot be de-sourced** by spectrum coverage
(§8.3) until other sources corroborate it, so it arrives with its label maximally attached; and this
is the first point where the shared substrate of §6.6 is written by the users being measured.

### 6.4 A note on the current code
The existing engine implements a **similarity-based diffusion** — the right *shape* — but the
similarity it computes is **user-user**, over users' source-trust vectors ("find people like me").
Two problems: it has no **within-user** cold-start estimation (§6.2), so a single brand-new user gets
only entity defaults with nothing surfaced from unrated sources; and the user-user form keys on the
most tribally-sorted signal, which clusters users by tribe and predicts *inward* (see §8.2).
Reconciling the engine — adding the within-user source-overlap estimation of §6.2, then the
fact-mediated path, and pointing any cross-user layer at fact-level idiosyncrasy — is real code work,
not a doc edit. Separately, the data model already carries user-authored assertions (assertions have
a source type and an author field, and there is a create endpoint), but nothing **prices** them:
§6.3's estimation problem is unimplemented, and there is no contribution UI.

### 6.5 Article construction and the "hidden synthetic voice"
Both Nudge and the MVD **construct readable, Wikipedia-like entries** from a user's trusted facts —
this is generated prose, not a raw fact list. Generated prose unavoidably has a **voice**: ordering,
emphasis, phrasing, what-leads-to-what are rhetorical choices even when no human made them, and a
readability layer tunes them. *"Hidden by intent"* means Nudge presents these entries in a plain,
encyclopedic style that **does not foreground that the text is synthesized** — it wears Wikipedia's
voiceless appearance even though a voice is present. This is a deliberate, eyes-open choice. Its risk
(see §8): a neutral-looking text can steer without the reader noticing, and two users get different
fluent, authoritative entries on "the same" topic.

### 6.6 Shared substrate, personalized view
There is **one shared topic and one shared fact database** — users cannot fork a topic into competing
articles; they add facts to the one that exists (§6.3). But each user's **rendered entry differs**:
different facts clear different thresholds, in different order. So "shared" describes the substrate
and the topic's identity, **not** the experience.
This is deliberate, and it is itself a risk: Wikipedia's trust comes partly from everyone seeing the
*same* words, and personalizing the view gives that up. Worth watching in the metrics.

---

## 7. Metrics are the product

Because every load-bearing claim is empirical, the **instrumentation is the central deliverable.** The
trust-routing is the hypothesis; the metrics are what distinguish a depolarization machine from a
polarization machine that produces identical-looking activity.

### 7.1 Separate ground truth from activity proxies
- **Proxies (cheap, and dangerous):** engagement, dial movement, cross-source facts surfaced, trust
  edges created, **facts contributed and how far they travel** (how many other users a peer-authored
  assertion clears the threshold for, and which §6.3 path priced it). **All can rise while the real
  target stays flat or reverses** — a contribution surface is especially good at manufacturing
  healthy-looking activity.
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

### 8.2 Don't build *cross-user* similarity on source-trust vectors
When estimating one user's trust from *other users* ("people like me"), don't compute that user-user
similarity over source-trust vectors: source-trust is the most tribally-sorted signal, so it clusters
users by tribe and predicts inward — turning the bridge into a bubble. Point any cross-user layer at
fact-level idiosyncrasy instead. This is **distinct from** the *within-user* source-overlap estimation
of §6.2, which is necessary for cold start and is not what this warns against. **Status:** a caution
about the cross-user layer; the current engine is built on exactly this user-user-over-source-trust
shape (§6.4). Adding user-authored assertions makes this caution **load-bearing rather than
theoretical** — per §6.3(c), user-user similarity is the most available way to price a novel claim
from a new contributor, so the MVD will be leaning on the suspect mechanism at exactly the moment it
matters. Instrument it accordingly.

### 8.3 Merit-versus-label headwind
Will a user judge a cross-source fact on its **content**, or bounce off the **source label**? Source
effects on credibility are real and documented, so this carries a prior against us. The dial, the
framing, and multi-source de-sourcing (a fact reported across the spectrum arrives effectively
de-sourced) exist to buy a few degrees of merit-judgment against that gravity. **Status:** a
measurable headwind, not a blocker.

### 8.4 The peer as messenger
A user-authored fact changes *who is speaking*. §2's trusted-messenger effect could cut either way: a
peer the reader already trusts may be the strongest possible carrier for a cross-cutting fact —
closer to the "unlikely validator" than any publication — or a stranger with no institutional weight
may be the weakest, judged on tribal cues alone since the claim arrives un-de-sourced (§6.3, §8.3).
There is a worse mode too: peer contribution can become **a channel for addressing the out-group
directly**, which is the force-feeding dynamic §2 says backfires, re-created inside the app by users
rather than by a bot. **Status:** newly in scope with fact contribution (§5), genuinely two-sided,
and measurable — compare how cross-cutting peer-authored facts perform against ingested ones.

### 8.5 Instrument effect
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
