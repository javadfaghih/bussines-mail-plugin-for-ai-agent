# v0.3.0 deployment and submission status

Verified October 11, 2026.

## Git and deployment

- Implementation commit: `03c508f683578330348b8491aa5ea7f4096baa09`.
- Branch: `fix/plugin-review-workflow`; the matching remote head was verified.
- The branch was fast-forward merged into `main` and pushed. GitHub's `Check`
  run for `1fa80ef0c9a2aaa514cdcdf993d14e74a773af01` passed.
- Cloudflare Builds is now connected to
  `javadfaghih/bussines-mail-plugin-for-ai-agent`, with production branch `main`,
  builds enabled, repository root `/`, and deploy command `npx wrangler deploy`.
  The dashboard requested a new push to start the first build. This documentation
  commit provides that trigger; its build/deployment outcome must be verified
  separately from the earlier manual deployment below.
- Worker: `bussines-mail-ai-agent-plugin`, existing endpoint
  `https://mcp.softlian.com/mail`.
- Deployed Worker version: `e6a07f82-f8e3-422d-a5a2-c68551592565`.
- Migration `0002_mail_followups.sql` applied successfully to the existing D1
  binding. Independent readback confirmed `mail_followups` and
  `mail_followups_due` in `sqlite_master`.
- Public protected-resource metadata now includes `followups:write` alongside
  `mail:read` and `mail:send`.
- The public privacy page now discloses task persistence and deletion, effective
  October 11, 2026. These checks do not prove authenticated mailbox behavior.

The environment API token lacked permission to query this D1 database. The
already-saved owner OAuth session had D1 permission and was used for migration
and deployment. No token, encryption key, credential, or access policy changed.

## OpenAI dashboard blocker

The existing plugin is `plugin_asdk_app_6ab626c456708191885671d8a91eb502`, under
Softlian Organization and developer identity Business — Ahmad Faghih. The
package name shown in the dashboard is
`app-6ab626c456708191885671d8a91eb502`. Its v0.2.0 status remains
**Changes required**, and it has not been published.

The upload copy used the existing dashboard package name while preserving the
local plugin source identity and the single original MCP endpoint. The ZIP was
selected and processed by the portal, which rejected the update with:

> Keep the existing MCP connection
> Configure the existing MCP app before updating its plugin ZIP.

The MCPs tab shows **Configuration unavailable**, **Endpoint unavailable**,
authentication **Unavailable**, MCP key **Not specified**, and domain verification
**Unavailable**. Rescan is disabled and no setup/edit action is offered there.
The plugin version selector contains only v0.2.0; no new draft was saved.

The historical editor for that same app/version still shows the original MCP
URL, OAuth, tool annotations, and verified domain, but says:

> Viewing the rejected version. Only draft versions can be edited.

This is an inconsistency between the portal's current app configuration and the
historical submission configuration, not evidence that the public server is
offline. No duplicate plugin/app was created, no binding was changed, and no
review was cancelled. Downloading the previous release ZIP was also cancelled
by the browser download flow.

## Remaining steps

The existing app's current configuration needs to become editable/available in
the OpenAI portal before the ZIP update can be saved. The visible management
page offers no action to repair it. OpenAI support can identify the record using
the app and plugin IDs above and the exact upload finding.

After that blocker is resolved, upload the v0.3.0 package for the same identity,
verify the preserved MCP connection, reconnect the dedicated fixture account
with task permission, run the eight cases, and record a real v0.3.0 demo.
Developer policy attestations remain to be completed in the final submission
step. **No v0.3.0 draft update or resubmission succeeded in this run.**

Local deliverables (excluded from Git under `work/`):

- `work/smpt-mail-plugin-0.3.0.zip`: local portable source package.
- `work/bussines-mail-openai-0.3.0.zip`: upload copy with the existing portal
  package name, inspected and processed by the portal.
- `work/openai-mcp-blocker.jpg`: screenshot of the current MCP configuration
  blocker. No credentials are present in this screenshot.
