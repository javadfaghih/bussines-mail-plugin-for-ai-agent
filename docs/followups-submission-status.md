# Softlian Mail Follow-ups: new submission

The user explicitly requested a completely new plugin after the existing
submission could not be updated. The original app was left intact.

## New identity and source

- Display name: Softlian Mail Follow-ups.
- Package name: `softlian-mail-followups`.
- Source: `plugins/softlian-mail-followups`.
- Publisher: Business — Ahmad Faghih, Softlian Organization.
- New OpenAI app: `asdk_app_6acb92724090819193dccdef08e92809`.
- New managed plugin: `plugin_asdk_app_6acb92724090819193dccdef08e92809`.
- Saved initial draft: `appsub_6acb927240c08191a8a0bcad13080488`, v0.3.0.
- Dashboard: https://platform.openai.com/plugins/manage/plugin_asdk_app_6acb92724090819193dccdef08e92809

The new draft was successfully created and its listing, capabilities, icons,
workflow skill, five positive cases, three negative cases, and release notes
were imported. Domain verification is already recognized for the unchanged
production endpoint `https://mcp.softlian.com/mail`. Country targeting in the
old submission was Allow all; the new draft likewise displays All supported
countries. No translation beyond the English base listing was provided.

## OAuth configuration update

The source package is now v0.3.1 and explicitly declares OAuth under each MCP
server's `extensions.com.openai.auth`:

- Dynamic Client Registration (`client.mode: dcr`).
- Authorization server base `https://mcp.softlian.com`.
- Authorization URL `/authorize`, token URL `/oauth/token`, registration URL
  `/oauth/register`, all on that same HTTPS origin.
- Resource `https://mcp.softlian.com/mail`.
- Base scopes `mail:read`, `mail:send`, and `followups:write`.

These values were verified against live OAuth discovery. An unauthenticated
MCP initialize call returns HTTP 401 with the matching protected-resource
metadata URL and scopes. No passwords, access tokens, or client secrets are
included in the ZIP.

The initial v0.3.0 connection drawer showed Authorization unavailable and did
not finish setup. The v0.3.1 upload is pending: the native macOS file chooser
kept Open disabled, and automatic extension uploads need Chrome's Allow access
to file URLs permission. The user approved temporary activation and later
revocation. Browser automation then rejected navigation to `chrome://extensions`
because only HTTP/HTTPS URLs are allowed, explicitly prohibiting workarounds.
The user was asked to enable the permission manually; no automated permission
change was made.

## Remaining review work

- Upload and verify v0.3.1, then complete OAuth through the provider's secure
  connection page with a dedicated synthetic-data mailbox and scan all tools.
- Run the eight review cases in the intended host against the saved version.
- Record and verify an actual walkthrough of the new follow-up workflow. The
  old mail-access recording is not evidence of the new workflow. The review
  drawer explicitly requires `review.demo_recording_url` in the ZIP.
- Enter reviewer access only in secure dashboard fields; do not put credentials
  in this source, the archive, or chat.
- Complete applicable publisher facts and legal/policy attestations before the
  final authorized Submit for review action.

**The new plugin is a saved draft, not a submitted or published release.**

References used for the explicit OAuth configuration:

- https://developers.openai.com/plugins/build/plugins#configure-mcp-authentication
- https://developers.openai.com/plugins/deploy/submission#configure-authentication-for-submission
