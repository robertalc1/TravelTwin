# Project Rules

## Auto-push
After every completed task:
1. Run `tsc --noEmit` to verify no TypeScript errors
2. Run `git add -A`
3. Run `git commit -m "descriptive message in english"`
4. Run `git push origin main`
Do this automatically without asking.

## General
- Never use `any` in TypeScript
- Always support dark mode
- Always make components responsive
