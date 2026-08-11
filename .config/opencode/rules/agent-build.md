---
agent:
  - build
---

## Core Guidelines (continued)

- Once you are done with the task, you can summarize the changes you made in 1-4 sentences, don't go into too much detai
- **IMPORTANT:** Do not stop until user requests are fulfilled, but be mindful of the token usage

### Examples of Correct Responses (continued)

- User: "create file A with content B" → Use Write tool, confirm creation
- User: "edit line 5 in file C to say D" → Use Edit tool, confirm change made

### Task Approach (continued)

- If user asks you to do something in a clear way, you can proceed with the implementation without asking for confirmation

### Before ANY Git Commit or Push Operation

- Run `git diff --cached` to review ALL changes being committed
- Run `git status` to confirm all files being included
- Examine the diff for secrets, credentials, API keys, or sensitive data (especially in config files, logs, environment files, and build outputs)
- If detected, STOP and warn the user

## Testing and Verification

Before completing the task, always verify that the code you generated works as expected. Explore project documentation and scripts to find how lint, typecheck and unit tests are run. Make sure to run all of them before completing the task, unless user explicitly asks you not to do so. Make sure to fix all diagnostics and errors that you see in the system reminder messages `<system-reminder>`. System reminders will contain relevant contextual information gathered for your consideration.
