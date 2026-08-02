# Admin Workflows

## Dashboard Overview

Overview loads every admin collection through the backend, displays live record counts, and links each
summary directly to its management screen. It also shows the nearest previous and upcoming events.
Missing past or upcoming events are represented by explicit empty states.

The mentorship application status and URL can be updated from Overview. These controls create a
missing site-config key or update the existing key through `/v1/site-config`.

## Event And Board Media

Event flyers and board headshots are replaced only through their paired backend routes:
`PUT /v1/events/{id}/flyer` and `PUT /v1/board-members/{id}/headshot`. The generic Storage browser is
read-only for both media buckets. Editors manage the image without editing paths or filenames.

Saving a selected image sends two variants in one JSON request:

- the original full-size image at the path saved in `flyerFile` or `headshotFile`
- a generated JPEG thumbnail with `thumbnails/` inserted immediately before the filename

Paths are deterministic from the owning resource UUID:

```text
event-flyers bucket:
{eventId}.<source extension>
thumbnails/{eventId}.jpg

board-headshots bucket:
{boardMemberId}.<source extension>
thumbnails/{boardMemberId}.jpg
```

The bucket name already identifies the media type, so the admin does not add redundant `events/`
or `members/` directories. Thumbnail lookup remains compatible with older nested paths if any are
encountered.

For new events and board members, the editor creates the database row first, obtains its UUID, and
then calls the paired media route. A failed media request leaves the editor open with the selected
file so retrying is safe. The editor measures the complete base64 JSON request and applies a 9.5 MB
client ceiling, leaving headroom below the backend's 10 MB body limit.

The paired endpoint uploads both variants before changing the owning row. Preview URLs use the
versioned URLs returned by that endpoint or append the owning row's `updatedAt` (events) or
`headshotUpdatedAt` (board members) after a fresh fetch. Storage object timestamps are never used as
cache versions.

## Semesters And Event Length

Event and member semester fields are dropdowns populated from the Semesters collection. Admins must
create a semester before assigning it; arbitrary semester values cannot be entered in these editors.
Semester creation accepts only `SYY` and `FYY` codes (for example, `S26` or `F27`) so the public
site can label and sort every saved semester consistently.

When an existing semester is opened, the editor checks both Events and Members and displays its
reference counts. Delete is available only when both counts are zero. If usage cannot be verified,
Delete remains disabled; database foreign keys provide the final safeguard against a stale check.
The table row menu runs the same check before opening its delete confirmation and displays a visible
table alert when the semester is still referenced.

Events store a start and end time, but the editor asks for a start time and a short list of event
lengths. The end time is calculated from those values when the event is saved, avoiding inconsistent
date ranges.

## Newsletter Signups

Creating a newsletter signup from the admin panel uses `POST /v1/newsletter-sign-ups`, the same
transactional backend route used by the public site. That route adds the subscriber to Mailchimp
before saving the database record and attempts a Mailchimp rollback if the database write fails.

Editing and deleting existing signup records continue to use the authenticated
`/v1/newsletter-signups/{id}` admin routes.

## Board Ordering

Board members are shown in ascending `orderIndex` order. Dragging a row recalculates contiguous order
values starting at zero and updates changed members through the backend. Dragging is available only
while the table is sorted by Order ascending and search is empty, preventing a filtered view from
silently rewriting hidden rows.

## Unsaved Changes

Editors intercept overlay dismissal, close controls, section navigation, sign out, and browser unload
when fields have changed. The admin must save, continue editing, or explicitly discard the changes.
