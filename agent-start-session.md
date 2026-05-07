# Agent Start Session

**Read this file first at the start of every session.**

You are resuming work on an ongoing project. To avoid drift and maintain continuity, follow this protocol exactly.

## Quick Context Load

Read these files in order before doing any work:

1. **[overview.md](overview.md)** - Project mission, goals, and non-negotiables
2. **[architecture.md](architecture.md)** - System design and key decisions
3. **[current-phase.md](current-phase.md)** - What we're building RIGHT NOW
4. **[roadmap-phases.md](roadmap-phases.md)** - Current Rip-to-Ship roadmap and phase status
5. **[RIP_TO_SHIP_HANDOFF.md](RIP_TO_SHIP_HANDOFF.md)** - Zero-context handoff prompt, execution process, and acceptance checklist
6. **[SELL_CARDS_ASAP_HANDOFF.md](SELL_CARDS_ASAP_HANDOFF.md)** - Immediate launch handoff for embedded checkout, webhook setup, and payment verification
7. **[changelog.md](changelog.md)** - Recent changes (read last 5-10 entries)

Optional deeper context:
- [technical-spec.md](technical-spec.md) - Full schema, route map, server actions, email/search/testing reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment notes, but verify against current code before trusting old status language

## Session Rules

1. **Stay in scope** - Only work on tasks defined in `current-phase.md`
2. **No silent pivots** - If you think the approach should change, discuss first
3. **Update as you go** - Log significant changes to `changelog.md` during the session
4. **End properly** - Update `changelog.md` and the current roadmap docs with what changed, what remains, and the next concrete continuation point
5. **Trust current reality over stale docs** - `current-phase.md`, `roadmap-phases.md`, and `RIP_TO_SHIP_HANDOFF.md` were refreshed on 2026-05-01. Older session summaries may describe earlier states.
6. **Handoff drives roadmap alignment** - If `RIP_TO_SHIP_HANDOFF.md` conflicts with another roadmap/session doc, reconcile the other doc before implementing.

## Before Writing Code

Confirm you understand:
- [ ] What is the current phase objective?
- [ ] What is explicitly OUT of scope?
- [ ] What are the success criteria?
- [ ] Are there any blockers or dependencies noted?

If any of these are unclear, ask before proceeding.

## Session Start Checklist

- [ ] Read all required context files
- [ ] Confirmed current phase is still accurate
- [ ] Checked `RIP_TO_SHIP_HANDOFF.md` if working on checkout/accounts/admin/fulfillment
- [ ] Confirmed `current-phase.md` and `roadmap-phases.md` still match the handoff implementation order
- [ ] No unresolved blockers from previous session
- [ ] Ready to continue from where we left off
