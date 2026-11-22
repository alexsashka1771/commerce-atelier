# Project conventions

- English source, filenames, and code comments.
- Windows PowerShell 5.1; no Docker dependency.
- Read README for setup and verification commands.
- Test business behavior before implementing it; reproduce bugs before fixes.
- Keep secrets in environment variables and out of logs.
- Use exact integer units for money and idempotency for external actions.
- Document which integrations are simulated, live, and untested.
- Do not commit, push, deploy, or make mainnet transactions without explicit user authorization.
