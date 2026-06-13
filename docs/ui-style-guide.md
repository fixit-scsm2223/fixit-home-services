# UI Style Guide

This document defines the shared visual theme for all FixIt modules. All team members must follow this style guide so the customer, provider, and admin modules look consistent.

## Theme

Theme name: Trust & Service

FixIt will use a clean, modern, and mobile-first design. The interface should look trustworthy, simple, and easy to use because the system deals with local home services and provider verification.

## Color Palette

| Purpose         | Color        | Hex     |
| --------------- | ------------ | ------- |
| Primary         | Blue         | #2563EB |
| Secondary       | Teal         | #14B8A6 |
| Success         | Green        | #22C55E |
| Warning         | Orange       | #F59E0B |
| Danger          | Red          | #EF4444 |
| Background      | Light Gray   | #F8FAFC |
| Card Background | White        | #FFFFFF |
| Main Text       | Dark Slate   | #1E293B |
| Muted Text      | Gray         | #64748B |
| Border          | Light Border | #E2E8F0 |

## Typography

The system will use a clean sans-serif font.

Recommended font:

* Inter
* Arial
* sans-serif

Main text should be readable on mobile, tablet, and desktop.

## Common UI Components

All modules should reuse the same component style for:

* Buttons
* Input fields
* Cards
* Tables
* Status badges
* Navigation bar
* Sidebar
* Forms
* Dashboard cards
* Alert messages

## Button Style

Primary buttons should use the main blue color.

Examples:

* Login
* Register
* Book Service
* Save Changes
* Verify Provider

Secondary buttons should use white background with border.

Danger buttons should use red.

Examples:

* Reject Provider
* Cancel Booking
* Delete Category

## Status Badge Colors

| Status       | Color     |
| ------------ | --------- |
| requested    | Gray      |
| accepted     | Blue      |
| rejected     | Red       |
| in_progress  | Orange    |
| completed    | Green     |
| cost_pending | Purple    |
| closed       | Dark Gray |
| reviewed     | Teal      |
| pending      | Orange    |
| verified     | Green     |
| suspended    | Red       |

## Layout Rules

* Use mobile-first responsive design.
* Use white cards on a light gray background.
* Use consistent spacing between sections.
* Use rounded corners for cards and buttons.
* Keep forms simple and clear.
* Use the same navigation style across customer, provider, and admin pages.

## Module Consistency

### Customer Module

The customer module should focus on browsing, booking, and tracking jobs. It should use cards for service categories, provider profiles, and bookings.

### Provider Module

The provider module should focus on job requests, job updates, profile management, and availability. It should use dashboard cards and clear status badges.

### Admin Module

The admin module should focus on monitoring, verification, and management. It should use tables, dashboard summaries, and action buttons.

## Shared CSS Variables

The frontend should define shared CSS variables so every module uses the same theme.

```css
:root {
  --color-primary: #2563EB;
  --color-secondary: #14B8A6;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;

  --color-background: #F8FAFC;
  --color-card: #FFFFFF;
  --color-text: #1E293B;
  --color-muted: #64748B;
  --color-border: #E2E8F0;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  --font-main: Inter, Arial, sans-serif;
}
```

## Final Rule

Every member must use the shared colors, spacing, buttons, cards, and status badges. No member should create a different design style for their own module.
