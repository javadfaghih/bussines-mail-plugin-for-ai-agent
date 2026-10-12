# Bussines Mail SMTP/IMAP: new submission

The user explicitly requested a completely new plugin after the existing
submission could not be updated. The original app was initially left intact;
the user later reported deleting it to release its MCP URL.

## New identity and source

- Display name: Bussines Mail SMTP/IMAP (exact spelling requested by the user).
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

Starting with v0.3.1, the source package explicitly declares OAuth under each MCP
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
not finish setup. After the user manually enabled Chrome's Allow access to file
URLs permission, v0.3.1 uploaded successfully. Its saved connection settings
match the explicit OAuth configuration above. Connect briefly saves the
configuration, then returns to Authorization unavailable without opening an
authorization page. This is a remaining blocker, not successful authorization.
No automated extension-permission change was made. The temporary permission
must be disabled manually after the last upload.

## Reviewer-account diagnostics

The user supplied a dedicated test account and authorized testing. Credentials
were passed only through non-echoing process input; they are not included in
source or the ZIP. IMAP and SMTP TCP connections succeed, but the direct TLS
authentication diagnostic failed with connection/timeout errors. These failures
do not establish an incorrect password or successful authentication. No email
was sent and no inbox content was read.

The v0.3.2 source adds `get_connection_status`, a read-only tool projecting only
the saved mailbox email and granted permissions. It never returns credentials,
provider hosts, or internal IDs and does not contact the provider. The skill
requires comparing a named mailbox with this identity before reading mail.
TypeScript checking and 26 automated tests passed; archive validation passed
for seven files, eleven tools, and five positive/three negative cases.

Commit `965d12a` was pushed to main. GitHub check and Cloudflare Workers Builds
both succeeded. v0.3.2 was uploaded and the dashboard explicitly shows
`0.3.2 · Draft`. A rescan failed with "The latest scan did not complete";
authentication remains unavailable and no tools have been discovered.

## MCP URL collision and requested name

The user's manual Connect attempt revealed the actual save error: the MCP URL
was already used by another app in this organization. v0.3.3 deployed a unique
endpoint, but the dashboard rejected the ZIP because an existing app's MCP URL
cannot change. v0.3.3 was not saved in OpenAI.

The user then reported deleting the old app, explicitly requested reusing the
original URL, and requested the display name `Bussines Mail SMTP/IMAP`.
v0.3.4 restores `https://mcp.softlian.com/mail` and applies that exact display
name. The new app and package identity remain unchanged. The temporary alias
was removed. No credentials or scopes changed.

## Saved v0.3.4 and successful authorization

Commit `d6f22d1` was pushed to main. GitHub checks and Cloudflare Workers Builds
succeeded. v0.3.4 was uploaded and saved; the Metadata & Skills tab shows
`0.3.4 · Draft`, the requested display name, and skill status `Checks passed`.

The user explicitly approved connecting the dedicated reviewer mailbox to
ChatGPT with `mail:read`, `mail:send`, and `followups:write`. Provider-side
authorization completed successfully. Both the draft connection and the
separate metadata-scan connection were completed. The dashboard now displays
`MCP configuration Configured`, `Authentication Authorized`, `Domain verified`,
and `No findings in the latest MCP scan`, with all eleven tools discovered.
The scan connection had to be reauthorized after completing draft setup;
the subsequent scan completed successfully. This supersedes the earlier
authentication and scan blockers recorded above.

Reviewer credentials and explicit sign-in instructions were saved only in the
secure review-information drawer; the portal confirmed `Progress saved`.
The instructions still truthfully say the synthetic INBOX fixture is pending.
No password, token, or client secret is stored in this document or package.

The submission dialog was inspected without accepting attestations or
submitting. It reports blocking `Incomplete review information`. Supporting
content explicitly reports a missing `review.demo_recording_url`. The retained
requested spelling also produces a non-blocking name-spelling finding.

An existing ChatGPT development connection to the same production `/mail`
endpoint was located and its tools refreshed. This development connection has
a different app ID from the public draft; it is not publication of v0.3.4.
A read-only account-status rehearsal completed in ChatGPT with the refreshed
`get_connection_status` tool. It identified an existing support mailbox with
read/send permission and no follow-up write scope. No messages were read or
searched and no tasks changed. This verifies the identity safeguard, not the
five positive or three negative review cases.

The user approved one exact synthetic self-email for the dedicated test mailbox
with subject `Review fixture: delivery date`. It has not been sent. Adding the
dedicated test account through ChatGPT's `Connect another account` reached the
provider login page, then Chrome blocked automation because another extension
UI was open. The user must dismiss that extension UI before browser work can
continue. Existing support-account access was preserved.

## Remaining review work

- Prepare the synthetic reviewer INBOX fixture, and select/verify the dedicated
  test mailbox in the intended host before running mailbox-content cases.
- Run the eight review cases in the intended host against the saved version.
- Record and verify an actual walkthrough of the new follow-up workflow. The
  old mail-access recording is not evidence of the new workflow. The review
  drawer explicitly requires `review.demo_recording_url` in the ZIP.
- Complete applicable publisher facts and legal/policy attestations before the
  final authorized Submit for review action.

**The new plugin is a saved draft, not a submitted or published release.**

References used for the explicit OAuth configuration:

- https://developers.openai.com/plugins/build/plugins#configure-mcp-authentication
- https://developers.openai.com/plugins/deploy/submission#configure-authentication-for-submission
