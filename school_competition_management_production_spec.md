# School Competition Management System

## Production-Grade Project Specification and Execution Plan

**Version:** 1.0\
**Purpose:** Implementation baseline for a secure school competition
registration, Excel import/export, registration-number, admit-card, and
WhatsApp communication system.

## 1. Project Scope

Build a school-operated web application for authorised staff. Students
do not self-register publicly.

Core capabilities: - Import multiple Excel workbooks, map inconsistent
column names, validate records, and flag duplicates for human review. -
Allow permission-controlled manual student entry and updates. - Preserve
existing valid registration numbers and safely allocate unique numbers
to new records. - Generate approximately 10,000 admit-card PDFs in
resumable batches. - Store private PDFs in the school's controlled
Google Drive account. - Search students and admit cards;
preview/download authorised PDFs. - Export a consolidated Master Excel
workbook. - Prepare personalised WhatsApp messages; optionally add
official automated WhatsApp messaging after cost, policy, and consent
approval. - Maintain role-based permissions, audit logs, backup/restore
procedures, monitoring, and tested recovery.

## 2. Known Constraints and Assumptions

-   Next.js is preferred.
-   Vercel is available, but the selected plan must be eligible for
    official school use.
-   Firebase Spark is the initial target for Authentication and
    Firestore.
-   A Google account reportedly has 5 TB storage; ownership,
    subscription continuity, available quota, API access, and
    school-data suitability must be verified.
-   Planning scale: 10,000--15,000 records and an initial target of
    100--500 concurrent users. These are targets, not proven capacity.
-   Cost should be minimised, but zero cost must not be promised.
-   Registration-number format, mandatory fields, admit-card template,
    data-retention period, and WhatsApp automation remain decisions to
    confirm.
-   Inspect actual source workbooks before treating any previous
    spreadsheet description as authoritative.

## 3. Architecture Decision

### 3.1 Modular monolith, not micro-frontends

Use one Next.js application with clear feature boundaries. Do not start
with independently deployed micro-frontends: they add deployment,
routing, authentication, monitoring, and integration complexity without
a demonstrated need at this scale. Keep modules independently testable
and separable for possible future extraction.

### 3.2 Proposed stack

  -----------------------------------------------------------------------
  Layer                   Choice                  Notes
  ----------------------- ----------------------- -----------------------
  Web app                 Next.js App Router +    Server Components by
                          TypeScript              default

  UI                      Tailwind CSS +          Accessible, responsive
                          shadcn/ui               components

  Hosting                 Vercel                  Verify plan eligibility
                                                  for official school
                                                  use; Hobby is
                                                  restricted to personal,
                                                  non-commercial use

  Authentication          Firebase                Verify current limits
                          Authentication,         and configuration
                          email/password          

  Database                Cloud Firestore         Monitor reads/writes
                                                  and free quotas

  PDF storage             Google Drive API        Private files;
                                                  server-side OAuth
                                                  credentials

  Excel                   SheetJS (`xlsx`)        Validate file type,
                                                  size, workbook and rows

  PDF                     `pdf-lib`               Server-side, bounded
                                                  batches

  Validation              Zod or equivalent       Validate all external
                                                  inputs server-side

  Tests                   Vitest + Playwright     Unit, integration and
                                                  end-to-end tests

  Source control          GitHub                  Protected main branch
                                                  and CI checks

  Monitoring              Structured logs and     Never log secrets or
                          error reporting         unnecessary student
                                                  data
  -----------------------------------------------------------------------

**Hosting warning:** Do not assume Vercel Hobby is allowed for a
school's official production use. Confirm the terms and select an
eligible plan/provider before launch.

**Firebase warning:** Avoid Firebase Cloud Functions and Firebase App
Hosting if remaining on Spark; those products require Blaze under
current plan rules. Next.js Route Handlers on Vercel can handle short
operations, but do not automatically provide a durable background-job
system.

### 3.3 High-level design

``` text
Authorised staff browser
        |
        v
Next.js app on approved Vercel plan
        |
        +-- Authentication verification
        +-- Server-side authorization
        +-- Student/registration APIs
        +-- Excel preview and commit
        +-- Master Excel export
        +-- Admit-card job management
        +-- Google Drive adapter
        +-- WhatsApp link / official API adapter
        |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
Firebase Auth          Cloud Firestore         Google Drive
staff identity         records/jobs/audit     private PDFs
```

Never expose Firebase Admin credentials, Google OAuth refresh tokens,
WhatsApp tokens, or other secrets to browser code.

## 4. Modules and Responsibilities

### 4.1 Authentication

-   Staff login/logout and password recovery.
-   Disable/revoke access when staff leave.
-   Verify identity on every protected server operation.
-   Use secure session/cookie settings where applicable.
-   A client-side route guard is not authorization.

### 4.2 Roles and permissions

Initial roles: - **Super Admin:** system configuration and
user/permission management. - **Admin:** student operations, imports,
exports, admit cards and reports as granted. - **Registration
Operator:** create/update registrations only as authorised. - **Excel
Operator:** import/review workbooks; export only if granted. -
**Read-only Operator:** search/view permitted records.

Suggested permissions: `students.read`, `students.create`,
`students.update`, `students.archive`, `imports.create`,
`imports.review`, `exports.master`, `registrationNumbers.manage`,
`admitCards.generate`, `admitCards.read`, `admitCards.download`,
`messages.prepare`, `messages.send`, `users.manage`,
`permissions.manage`, `auditLogs.read`, `settings.manage`.

Enforce permissions on every server-side operation; deny by default.
Audit permission changes.

### 4.3 Student records

-   Create, view, update and archive according to permissions.
-   Search by registration number and approved fields.
-   Use pagination; never load the whole collection into the browser.
-   Normalise and validate phone numbers, dates, names, class,
    institution and competition.
-   Track import provenance where practical.
-   Never invent missing data or automatically merge/delete records
    solely because names match.

### 4.4 Excel import

1.  Upload and validate extension, file size, workbook structure and row
    count.
2.  Parse supported workbooks and map source headings to a canonical
    schema.
3.  Normalise whitespace, date formats, phone numbers and text without
    changing meaning.
4.  Validate required fields and business rules.
5.  Treat duplicate registration numbers as conflicts.
6.  Flag possible duplicate people for human review.
7.  Show preview counts: valid, warning, rejected, duplicate candidates,
    and proposed changes.
8.  Require authorised confirmation before committing.
9.  Commit in bounded batches with per-row/job status.
10. Make retries idempotent so reprocessing a file does not duplicate
    records.
11. Provide error reports and import history.
12. Preserve source files/manifests according to a documented retention
    policy.

Do not mutate data during preview. A failed import must be recoverable
and auditable.

### 4.5 Registration-number allocation

-   Confirm the exact format before coding.
-   Preserve existing valid numbers unless an authorised, audited
    correction is approved.
-   Allocate new numbers on the server with transaction/locking
    protection; do not simply read the latest number and increment
    without concurrency protection.
-   Handle collisions explicitly and test simultaneous registrations.
-   Do not reuse numbers after deletion; use archive/void states.
-   Audit manual changes and reasons.
-   Define review rules for missing, malformed, or duplicated legacy
    numbers.

### 4.6 Master Excel export

-   Export only fields the user is authorised to access.
-   Keep stable column order and documented date/phone formats.
-   Neutralise spreadsheet formula injection in untrusted text where
    appropriate.
-   Audit actor, time, and export scope.
-   Never expose exports through permanent public URLs.

### 4.7 Admit-card jobs

-   Version the PDF template.
-   Generate PDFs server-side in configurable batches.
-   Track job ID, student ID, registration number, template version,
    file ID, status, timestamps and error codes.
-   Use states such as `QUEUED`, `PROCESSING`, `READY`, `FAILED`,
    `CANCELLED`.
-   Support resume, bounded retries and failed-item reports.
-   Avoid regenerating unchanged PDFs using a canonical data hash and
    template version.
-   Mark PDFs stale when source data changes and regenerate through a
    controlled job.
-   Upload to Drive, save file ID, and reconcile cases where upload
    succeeds but the database update fails.
-   Do not report success until every expected item has a verified
    result.
-   Never generate all 10,000 PDFs in one browser session or one HTTP
    request.

**Background-job constraint:** Vercel request handlers have execution
limits. Use durable job state and bounded work units. Before launch,
prove the chosen plan can run the required workload. If not, approve an
appropriate background worker/queue or paid service; do not fake
background processing with long-running requests.

### 4.8 Google Drive

-   Prefer a dedicated, school-controlled account.
-   Verify subscription, available storage, API access, ownership and
    recovery procedures.
-   Configure OAuth and the narrowest workable scopes.
-   Store secrets and refresh tokens only server-side.
-   Keep PDFs private by default; never make the entire folder public.
-   Store Drive file IDs as authoritative references, not filenames.
-   Use backend-mediated access or short-lived controlled links where
    feasible.
-   Apply bounded exponential backoff for transient errors/rate limits.
-   Log failures without secrets or full sensitive records.
-   A 5 TB plan does not guarantee unlimited API throughput or permanent
    subscription.

### 4.9 WhatsApp

**Phase 1: manual, lower-cost workflow** - Prepare personalised messages
and `wa.me` click-to-chat links. - Let an authorised operator review
recipient and content before opening WhatsApp. - Distinguish "prepared"
or manually marked "sent" from provider-confirmed delivery.

**Phase 2: optional official automation** - Use the official WhatsApp
Business Platform/Cloud API only after confirming account eligibility,
phone setup, current pricing, templates, recipient consent/notice
requirements and policy compliance. - Keep tokens server-side. - Use
controlled batches, rate limiting, job state and webhook-confirmed
delivery statuses. - Add opt-out/suppression rules and duplicate-send
protection. - Provide dry-run/preview and explicit confirmation for bulk
sends. - Retry only appropriate failures; ambiguous results must not
cause duplicate sends. - Do not use unofficial WhatsApp Web automation
or bypass platform restrictions. - Automated messaging is not guaranteed
to be free.

### 4.10 Contact and settings

-   Configurable school name, phone, email and address.
-   If an inquiry form is enabled, validate server-side and rate-limit
    abuse.
-   Never expose private student data on public pages.

## 5. Suggested Data Model

Finalise against actual Excel files before implementation.

### `users`

`uid`, `displayName`, `email`, `active`, `roleIds`/permission
references, `createdAt`, `updatedAt`, `lastLoginAt`.

### `students`

`studentId` (immutable internal ID), `registrationNumber`, `name`,
`fatherName`, `dateOfBirth`, `phone`, `schoolOrCollege`, `className`,
`competitionName`, `status` (`ACTIVE`, `ARCHIVED`, `VOID`),
`sourceImportId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
`dataVersion`.

Collect only necessary fields and restrict access to DOB/phone.

### `imports`

`importId`, `fileName`, `fileFingerprint`, `uploadedBy`, `uploadedAt`,
`status`, `totalRows`, `validRows`, `warningRows`, `rejectedRows`,
`processedRows`, `mappingVersion`, `errorReportReference`.

### `admitCardJobs`

`jobId`, `createdBy`, `createdAt`, `status`, `templateVersion`, `total`,
`processed`, `succeeded`, `failed`, `lastProgressAt`,
`lastErrorSummary`.

### `admitCards`

`studentId`, `registrationNumber`, `driveFileId`, `templateVersion`,
`sourceDataHash`, `status`, `generatedAt`, `updatedAt`.

### `auditLogs`

`eventId`, `actorUid`, `action`, `targetType`, `targetId`, `timestamp`,
`result`, `reason` when relevant, minimal non-sensitive metadata.

### `messageJobs` / `messageEvents` (only if needed)

`jobId`, `recipientStudentId`, restricted recipient data,
`templateName`, `providerMessageId`, `status`, timestamps and error
code.

Never store raw passwords, access tokens or refresh tokens in Firestore.

## 6. Security Requirements --- Release Blockers

-   Verify identity and authorization on every protected API/action.
-   Deny by default.
-   Test Firestore Security Rules with the Emulator Suite.
-   Never ship open/test-only rules.
-   Keep secrets out of Git, client bundles, source maps and logs.
-   Validate inputs and reject unexpected payloads.
-   Restrict file size, row count, body size and allowed workbook types.
-   Use least privilege for Drive scopes and Firebase access.
-   Keep PDFs private and protect download endpoints.
-   Use HTTPS and secure session/cookie settings.
-   Avoid logging full phone numbers, DOBs, tokens, PDF content or
    complete student records.
-   Apply CSRF protection where cookie-based mutations require it.
-   Configure reviewed security headers and Content Security Policy.
-   Update dependencies and run vulnerability checks.
-   Audit student changes, permissions, imports, exports, PDF jobs and
    messages.
-   Define retention, account termination, incident response and
    recovery procedures.
-   Test with an ordinary operator account, not only an admin.

## 7. Performance and Reliability

-   Use Server Components by default and minimise client JavaScript.
-   Lazy-load non-critical interfaces and heavy tools.
-   Paginate student lists and use indexed queries.
-   Debounce search and avoid queries on every keystroke.
-   Avoid unnecessary repeated database reads.
-   Bound concurrency for Drive uploads and PDF generation.
-   Use timeouts and bounded exponential backoff.
-   Make imports and PDF jobs idempotent and resumable.
-   Expose job progress and failure reports.
-   Cache only safe data; never publicly cache private student
    records/PDFs.
-   Prevent authenticated responses from being shared across users.
-   Monitor API failures, Firestore quota, Drive errors, job failures
    and latency.
-   Do not claim 500-concurrent-user support until realistic load tests
    demonstrate it.

## 8. Backup and Operations

Before production: - Document Firestore backup/export options and
associated plan/cost requirements. - Back up critical records and import
manifests in a controlled location. - Keep a backup separate from the
primary working dataset where feasible. - Test restore into a
non-production environment. - Document Google account recovery and
ownership transfer. - Define incident contacts and rollback
procedures. - Use separate development, staging and production projects
where feasible. - Never test destructive imports against production
data. - Require explicit approval for bulk imports, mass exports, bulk
PDF regeneration and bulk messaging.

A backup is not proven until restoration has been tested.

## 9. Testing and Release Gates

### Unit tests

-   Normalisation, validation, column mapping, date parsing.
-   Duplicate-candidate logic.
-   Registration-number allocation and concurrency.
-   Permission decisions.
-   PDF data formatting.
-   Spreadsheet formula-injection handling.

### Integration tests

-   Authentication/authorization on APIs.
-   Import preview, commit and idempotent retry.
-   Registration-number concurrency.
-   Drive upload failures and reconciliation.
-   PDF job resume/retry.
-   Export access controls.
-   WhatsApp link generation; if automated, webhook status handling.

### End-to-end tests

-   Admin logs in and grants an operator limited permissions.
-   Operator can create an allowed record but cannot perform forbidden
    actions.
-   Admin imports a workbook, reviews warnings and confirms.
-   Master Excel exports correctly.
-   PDF batch resumes after a simulated failure.
-   Admin searches and downloads a private admit card.
-   Admin prepares a personalised WhatsApp message.

### Load and resilience tests

-   Start with 100 concurrent users, then increase toward 500 only if
    metrics remain acceptable.
-   Test realistic mixes of login, search, student details, and PDF
    retrieval.
-   Simulate Drive rate limits and transient errors.
-   Test Firestore quota exhaustion behaviour.
-   Test malformed/oversized workbooks.
-   Test interrupted PDF jobs, recovery, backup restore and rollback.

### Release gate

Do not launch until: - No unresolved critical/high security findings
remain. - API-level permissions are tested. - Concurrency tests show no
duplicate registration numbers. - Import failures are recoverable and
auditable. - PDF jobs resume without corrupting state. - Unauthorised
users cannot fetch private PDFs. - Backup restore has been
demonstrated. - Hosting plan and API quotas are understood. - School
approves data handling and messaging practices.

## 10. Task Execution Plan

### Phase 0 --- Discovery and sign-off

**Tasks** - Inspect actual workbooks and representative rows. - Confirm
columns, formats and registration-number rules. - Approve
role/permission matrix. - Approve admit-card template. - Verify Google
account ownership and Drive API setup. - Verify hosting eligibility and
backend execution limits. - Decide manual WhatsApp only vs official API
automation.

**Deliverables:** Requirements document, schema, permission matrix,
architecture decision record, risk list.\
**Exit condition:** No unresolved decision likely to force a major
architecture change.

### Phase 1 --- Foundation and CI

**Tasks:** Create repository, protected branches, Next.js/TypeScript
setup, lint/format/test commands, environment separation, CI checks,
design tokens and base components.\
**Deliverables:** Reproducible dev setup, passing CI, deployment
preview.

### Phase 2 --- Authentication and authorization

**Tasks:** Configure Firebase Auth, verify identity server-side,
implement roles/permissions, protect routes/APIs, audit permission
changes, test denied access.\
**Deliverables:** Login, role management and security-rule tests.

### Phase 3 --- Student and registration core

**Tasks:** Canonical schema, server validation, CRUD/archive,
search/pagination, collision-safe registration numbers, audit events and
indexes.\
**Deliverables:** Tested student workflows and concurrency evidence.

### Phase 4 --- Excel import/export

**Tasks:** Upload validation, column mapping, normalisation, preview,
duplicate review, idempotent batch commit, error report, secured Master
Excel export.\
**Deliverables:** Tested import workflow and verified export.

### Phase 5 --- Drive and admit cards

**Tasks:** Private Drive integration, PDF template/versioning, durable
job state, bounded batches, upload, file IDs, progress, retries,
reconciliation, search/preview/download.\
**Deliverables:** Test batch, failure/retry demonstration, private-file
access tests.

### Phase 6 --- WhatsApp

**Baseline:** Personalised `wa.me` links and message preview, with
accurate manual status tracking.\
**Optional automation:** Official API, templates, consent/notice,
pricing approval, queue, webhooks, opt-out and failure reports.\
**Deliverable:** Tested manual workflow; automation remains disabled
until approved.

### Phase 7 --- Hardening and launch

**Tasks:** Responsive/accessibility review, security and dependency
audit, load/quota tests, backup restore drill, production config review,
staff training, runbook and rollback plan.\
**Deliverables:** Signed release checklist and post-launch monitoring
plan.

## 11. Definition of Done

A feature is not complete merely because its UI exists. It is done only
when: - Server-side validation and authorization exist. - Loading,
empty, success and error states are covered. - Core logic has automated
tests. - Sensitive data is not exposed in URLs, logs or client code. -
Failures are visible and recoverable. - Required audit events are
recorded. - Documentation is updated. - CI and staging checks pass.

## 12. Explicit Non-Goals for Version 1

Do not build unless separately approved: - Public student
self-registration. - Independently deployed micro-frontends. -
Unofficial WhatsApp Web automation. - Automatic deletion/merging of
possible duplicates. - Public folders of all admit cards. - Complex
analytics/BI. - Unnecessary AI features. - A bespoke distributed queue
before a proven need.

## 13. Decisions Required Before Coding

1.  Exact registration-number format and sequence.
2.  Required fields for a valid student.
3.  Approved admit-card design and fields.
4.  School ownership/admin of the 5 TB Google account.
5.  Hosting plan approved for school use.
6.  Whether resumable operator-triggered jobs are sufficient or a
    dedicated background worker/paid queue is approved.
7.  Manual WhatsApp links or paid official API automation.
8.  Retention periods for student data, PDFs, import files and logs.
9.  Who owns data and approves exports/mass communications.
10. Performance targets for search, download and bulk jobs.

Do not invent answers; record and approve them.

## Final Technical Direction

Build a **modular Next.js monolith** on an approved Vercel plan, use
Firebase Authentication and Firestore within verified limits, and store
private admit-card PDFs in the school's controlled Google Drive account.
Implement server-side authorization, collision-safe registration
numbers, idempotent Excel imports, resumable PDF jobs, auditable
exports, and official WhatsApp integration only if approved.

The main production risks are access control, duplicate data, concurrent
number allocation, long-running PDF jobs, Drive API limits, hosting-plan
eligibility, quota exhaustion and recovery from partial failures---not
the amount of static code or images. Resolve and test these before
launch.
