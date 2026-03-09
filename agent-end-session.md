# Agent End Session

**Complete this checklist before ending any session.**

The goal is to leave the project in a state where the next agent (or future you) can pick up immediately without loss of context.

## Required Updates

### 1. Update Changelog
Add an entry to [changelog.md](changelog.md) with:
- Date
- Summary of what was accomplished
- Any files created/modified
- Decisions made and why

### 2. Update Current Phase Status
Review [current-phase.md](current-phase.md) and update:
- [ ] Mark completed tasks/deliverables
- [ ] Note any blockers discovered
- [ ] Update "Next Steps" if priorities shifted
- [ ] If phase is complete, mark it and define next phase

### 3. Flag Incomplete Work
If leaving work unfinished:
- [ ] Document exactly where you stopped
- [ ] List what remains to be done
- [ ] Note any gotchas or context the next session needs

### 4. Architecture Changes
If you made architectural decisions:
- [ ] Update [architecture.md](architecture.md) with the decision and rationale
- [ ] Document any new patterns or conventions introduced

## Session Handoff Summary

Before ending, provide a brief handoff statement:

```
## Session Summary [DATE]
**Completed:** [what was done]
**Stopped at:** [where you left off]
**Next session should:** [immediate next action]
**Blockers:** [any blockers, or "None"]
```

Add this summary to the top of the changelog entry.

## Pre-Close Verification

- [ ] Changelog updated with session summary
- [ ] Current phase reflects actual progress
- [ ] No uncommitted mental context (write it down!)
- [ ] Next session can start without asking "what were we doing?"

## Quick Reference: What to Document

| If you... | Update... |
|-----------|-----------|
| Completed a task | current-phase.md (mark done) |
| Made a decision | changelog.md (with reasoning) |
| Changed architecture | architecture.md |
| Hit a blocker | current-phase.md (blockers section) |
| Finished a phase | roadmap-phases.md + new current-phase.md |
| Discovered a bug | current-phase.md or create issue |
