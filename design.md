VendorFlow — Design Specification

1. Purpose

VendorFlow is a B2B supplier management platform.

The interface must feel:

professional

modern

calm

operational

trustworthy

information-dense without feeling cluttered

This is not a marketing website. It is a work tool used repeatedly during the day.

The design should prioritize:

clarity

speed of use

predictable interaction

readable data

consistent hierarchy

Avoid decorative complexity that does not improve usability.

2. Design Direction

VendorFlow should resemble a modern B2B SaaS application.

The visual language should be:

light main workspace

neutral surfaces

subtle borders

restrained shadows

moderate corner radius

strong typography hierarchy

one primary accent color

semantic colors only when necessary

tables as the primary data presentation pattern

The application should feel closer to an operations dashboard than a consumer app.

Avoid

Do not use:

giant gradient backgrounds

glassmorphism

excessive shadows

oversized cards

decorative charts with no operational value

random illustrations

excessive rounded pills

excessive animation

bright colors across the entire UI

inconsistent component styles

landing-page-style layouts inside the application

3. Typography

Preferred font:

Inter

Fallback:

font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;

Type Scale

Usage

Size

Weight

Page title

28–32px

600–700

Section title

18–20px

600

Card metric

28–32px

600–700

Body

14–16px

400

Table header

12–13px

600

Secondary text

13–14px

400

Helper text

12–13px

400

Avoid using bold text excessively.

4. Color System

Use neutral colors for most of the interface.

The exact shades may be adjusted slightly during implementation, but the hierarchy must remain consistent.

Base Tokens

:root {
  --vf-bg: #f7f8fa;
  --vf-surface: #ffffff;
  --vf-surface-muted: #f3f4f6;

  --vf-text: #111827;
  --vf-text-secondary: #4b5563;
  --vf-text-muted: #6b7280;

  --vf-border: #e5e7eb;
  --vf-border-strong: #d1d5db;

  --vf-primary: #3b5ccc;
  --vf-primary-hover: #304baa;
  --vf-primary-soft: #eef2ff;

  --vf-success: #15803d;
  --vf-success-bg: #ecfdf3;

  --vf-warning: #b45309;
  --vf-warning-bg: #fffbeb;

  --vf-danger: #b42318;
  --vf-danger-bg: #fef3f2;

  --vf-neutral-status: #475467;
  --vf-neutral-status-bg: #f2f4f7;
}

Status Colors

Status

Text

Background

PENDING

amber/brown

pale amber

APPROVED

green

pale green

REJECTED

red

pale red

SUSPENDED

dark neutral / muted red

pale neutral

Status badges should be compact and readable.

Do not use status colors as large card backgrounds.

5. Spacing

Use a consistent 4px-based spacing system.

Recommended scale:

4px
8px
12px
16px
20px
24px
32px
40px
48px

Default page padding:

Desktop: 24–32px
Tablet: 20–24px
Mobile: 16px

Default vertical spacing between major sections:

24–32px

6. Borders, Radius and Shadows

Border Radius

Inputs: 8px
Buttons: 8px
Cards: 10–12px
Badges: 999px only for compact status/tag elements

Do not make every element pill-shaped.

Shadows

Use shadows sparingly.

Prefer:

box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);

Most cards should rely primarily on borders.

7. Global Layout

Desktop-first application.

Primary structure:

┌──────────────┬─────────────────────────────────────────┐
│              │                                         │
│   Sidebar    │              Main content               │
│              │                                         │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘

Sidebar

Recommended width:

240–260px

Contains:

VendorFlow brand

Dashboard

Suppliers

organization selector if needed

user/account area near bottom

The active navigation item should be visually obvious but not loud.

Example:

VendorFlow

Dashboard
Suppliers

----------------

VendorFlow Inc
Alex
ADMIN

Main Content

Use a max readable width where useful, but data tables can expand naturally.

Avoid centering the entire SaaS layout like a marketing page.

8. Top-Level Navigation

Navigation items for MVP:

Dashboard
Suppliers

Do not create empty menu items for future features.

Possible future items may include:

Documents
Evaluations
Settings

but they should not appear until implemented.

9. Buttons

Primary Button

Use for the main action of a page.

Examples:

Add supplier
Create supplier
Save changes
Approve

Secondary Button

Use for neutral actions.

Examples:

Cancel
Edit supplier
Back

Destructive Button

Use only for destructive actions.

Examples:

Delete
Reject
Suspend

Destructive actions should not visually dominate the page.

General Rules

button height: approximately 40px

consistent horizontal padding

icon + text only when icon adds meaning

avoid more than one primary button per section

10. Form Controls

Inputs should use:

visible label above input

optional helper text below

clear validation message

40–44px minimum control height

subtle border

visible focus state

Example:

Legal name *
[ Microsoft Corporation              ]

Trade name
[ Microsoft                          ]

Tax ID *
[ 12.345.678/0001-00                 ]

Error state:

Tax ID *
[ 12.345...                          ]
A supplier with this tax ID already exists.

Do not rely on placeholder text as the only label.

11. Tables

Tables are one of the most important visual elements in VendorFlow.

Supplier table columns:

Supplier
Tax ID
Responsible
Status
Updated
Actions

Recommended row height:

52–60px

Table header:

muted background or white

uppercase is optional

compact typography

clear column separation through spacing, not heavy borders

Rows:

subtle hover

clickable supplier name

no excessive dividers

consistent alignment

Example:

Supplier              Tax ID              Responsible      Status      Updated
--------------------------------------------------------------------------------
Microsoft             12.345...           Carlos           APPROVED    Sep 8
AWS                   98.765...           Carlos           PENDING     Sep 7
Oracle                44.222...           Alex             SUSPENDED   Sep 6

Actions should not dominate the row.

Prefer a small overflow menu for secondary actions.

12. Search and Filters

Supplier list toolbar:

[ Search suppliers...                       ] [ Status ▾ ] [ Responsible ▾ ] [+ Add supplier]

Search should support:

legal name

trade name

tax ID

Filters:

status

responsible

Optional ordering:

newest

oldest

name A–Z

last updated

Keep filters compact and aligned with the table.

13. Pagination

Use server-side pagination.

Example:

Showing 1–20 of 64

< Previous    1   2   3   4    Next >

Avoid infinite scrolling for the MVP.

14. Status Badge Component

Create one reusable component:

<StatusBadge status="PENDING" />

Visual examples:

PENDING
APPROVED
REJECTED
SUSPENDED

Rules:

compact

consistent width behavior

semantic color

no icon required

uppercase optional if matching API values

15. Dashboard

The Dashboard should remain operational and simple.

Header

Dashboard

Good morning, Alex.
Here is what needs your attention today.

Summary Metrics

Use 3–4 compact metric cards:

Total suppliers
Pending
Approved
Suspended

Example layout:

┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 48            │ │ 7             │ │ 37            │ │ 4             │
│ Total         │ │ Pending       │ │ Approved      │ │ Suspended     │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

Do not add charts unless they communicate something useful.

Attention Section

Example:

Suppliers requiring attention

AWS                   PENDING        Carlos
Oracle                SUSPENDED      Alex
Acme Supplies         PENDING        Carlos

The Dashboard should answer:

What needs attention?

not:

How many decorative charts can fit on screen?

16. Suppliers Page

Primary working screen.

Header

Suppliers

Manage supplier records, responsibilities and approval status.

                                              [+ Add supplier]

Toolbar

[ Search suppliers... ] [ Status ▾ ] [ Responsible ▾ ]

Table

Use the table specification described above.

Empty State

If no suppliers exist:

No suppliers yet

Add your first supplier to start managing your vendor network.

[ Add supplier ]

Avoid illustrations unless extremely subtle.

17. Supplier Details Page

Suggested structure:

← Suppliers

Microsoft Corporation                            [ APPROVED ]

Microsoft
12.345.678/0001-00

                                           [ Edit supplier ]

------------------------------------------------------------

General information

Legal name          Microsoft Corporation
Trade name          Microsoft
Email               supplier@microsoft.com
Phone               +55 11 99999-9999
Website             microsoft.com
Responsible         Carlos
Created             Sep 8, 2026

------------------------------------------------------------

Workflow

Current status       APPROVED

                                           [ Suspend supplier ]

For a PENDING supplier:

Workflow

Current status       PENDING

                               [ Reject ] [ Approve ]

Role-Based Actions

Viewer:

Read only

Manager:

Edit
Approve
Reject

Admin:

Edit
Approve
Reject
Suspend
Delete

Never render actions that the user cannot perform when the current role is known.

Backend authorization remains the source of truth.

18. Create Supplier Page

Structure:

Create supplier

Basic information
--------------------------------

Legal name *
[________________________________]

Trade name
[________________________________]

Tax ID *
[________________________________]

Contact
--------------------------------

Email
[________________________________]

Phone
[________________________________]

Website
[________________________________]

Management
--------------------------------

Responsible
[ Carlos — Manager                 ▾ ]

Notes
[________________________________]
[________________________________]

                            [ Cancel ] [ Create supplier ]

The page should not be split into unnecessary cards.

Use section headings and spacing.

19. Edit Supplier Page

Reuse the same form component used by Create Supplier.

Differences:

Title: Edit supplier
Primary action: Save changes

Do not duplicate form implementation unless necessary.

20. Login Page

Keep it minimal.

Recommended structure:

VendorFlow

Supplier management, simplified.

Email
[________________________________]

Password
[________________________________]

[ Sign in ]

The login card should be centered vertically within reason, but avoid huge hero sections.

No illustration is required.

21. Loading States

Use skeletons for:

table rows

supplier details

dashboard metrics

For form actions:

[ Creating... ]
[ Saving... ]

Disable actions while the request is in progress.

Avoid full-page spinners when only one section is loading.

22. Error States

Display useful errors close to the affected area.

Examples:

Could not load suppliers.
Try again.

Form errors should appear near the field when possible.

Permission errors:

You do not have permission to perform this action.

Do not expose stack traces or raw backend errors to users.

23. Confirmation Dialogs

Require confirmation for:

Delete supplier
Reject supplier
Suspend supplier

Example:

Suspend supplier?

This supplier will no longer be considered active.

[ Cancel ] [ Suspend ]

Keep dialogs short.

24. Responsive Behavior

Primary focus: desktop.

Desktop

persistent sidebar

full supplier table

filters inline

Tablet

collapsible sidebar

filters may wrap

table may use horizontal scroll when necessary

Mobile

sidebar becomes drawer

actions remain accessible

supplier rows may transform into compact stacked rows/cards

forms become single-column

Do not sacrifice desktop productivity for mobile aesthetics.

25. Accessibility

Required:

semantic HTML

visible focus states

keyboard accessible controls

proper labels

sufficient contrast

buttons must be actual <button> elements

links must be actual links

form errors should be associated with their inputs

status must not rely only on color

26. Icons

Use a single icon library consistently.

Recommended:

Lucide

Possible icons:

LayoutDashboard
Building2
Plus
Search
Filter
ChevronDown
ArrowLeft
Pencil
Trash2
Check
X
Ban
LogOut

Icons are supportive, not decorative.

27. Component Architecture

Prefer reusable components.

Suggested structure:

components/
  layout/
    AppSidebar
    PageHeader

  ui/
    Button
    Input
    Select
    Modal
    StatusBadge
    EmptyState
    LoadingSkeleton

  suppliers/
    SupplierTable
    SupplierFilters
    SupplierForm
    SupplierWorkflowActions

Avoid creating a unique visual pattern for every page.

28. Role-Aware UI

Roles:

ADMIN
MANAGER
VIEWER

UI behavior:

Action

Viewer

Manager

Admin

View suppliers

Yes

Yes

Yes

Create supplier

No

Yes

Yes

Edit supplier

No

Yes

Yes

Approve

No

Yes

Yes

Reject

No

Yes

Yes

Suspend

No

No

Yes

Delete

No

No

Yes

The frontend should hide or disable actions according to the current organization membership.

The backend remains authoritative.

29. API Integration Assumptions

Expected API contract:

POST /api/auth/token/
POST /api/auth/token/refresh/

GET /api/me/

GET /api/organizations/
GET /api/organizations/{organization_id}/members/

GET /api/organizations/{organization_id}/suppliers/
POST /api/organizations/{organization_id}/suppliers/

GET /api/organizations/{organization_id}/suppliers/{supplier_id}/
PATCH /api/organizations/{organization_id}/suppliers/{supplier_id}/
DELETE /api/organizations/{organization_id}/suppliers/{supplier_id}/

POST /api/organizations/{organization_id}/suppliers/{supplier_id}/approve/
POST /api/organizations/{organization_id}/suppliers/{supplier_id}/reject/
POST /api/organizations/{organization_id}/suppliers/{supplier_id}/suspend/

Do not change this contract from the frontend without an explicit backend decision.

30. Design Source of Truth

This file is the visual and UX source of truth for the VendorFlow frontend.

When implementing:

reuse existing components

preserve spacing and typography hierarchy

preserve role-aware behavior

do not invent new visual patterns unless necessary

do not alter backend architecture for frontend convenience

prioritize clarity over decoration

If a design decision is not covered here, choose the simplest option consistent with the rest of this specification.

31. Implementation Guidance for Codex

When implementing the frontend:

Build the application from this specification.

Do not redesign the product independently.

Do not add unrequested pages.

Do not add placeholder features.

Do not alter backend models, tenant isolation, RBAC or workflow without explicit approval.

Reuse shared components.

Keep the interface visually restrained.

Favor tables, forms and operational clarity.

Ensure all role-dependent actions are reflected correctly.

Keep the MVP compact enough to finish quickly.

The goal is not to create the largest possible product.

The goal is to create a polished, credible B2B SaaS portfolio project.