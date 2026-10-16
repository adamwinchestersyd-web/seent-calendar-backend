---
name: Release approval
description: User's development-first production approval requirement
---
Do not push new work to production until the user has had a chance to test it and explicitly approves the production push.

**Why:** The user objected to production being updated with untested work: "I don't want prod pushed with the new work until I can test it."

**How to apply:** A previous production approval is not standing permission to deploy later fixes or features. Keep changes local or in the approved development release until a new production push is authorized.

## Parallel AWS transition
The customer is moving toward AWS through a customer-owned GitHub repository. The user requires a separate AWS delivery branch while the existing production calendar on Render continues working and remains maintainable.

**Why:** The user emphasised that continued Render operation is critical while AWS work is finalised and requested customer approval of the full plan before implementation.

**How to apply:** Do not replace existing remotes, repoint Render branches or change live integration routing as part of AWS preparation. Keep AWS delivery isolated and require separate approval for production cutover. Describe customer-facing repository housekeeping as documentation and deployment-package cleanup.
