---
name: leave-management
description: Describe when to use this prompt
---

<!-- Tip: Use /create-prompt in chat to generate content with agent assistance -->

Employees should be able to submit a leave request through the system. Their manager should get notified and be able to approve or decline it. HR needs to be able to see everything and step in when needed. The system should track leave balances so people can't take more days than they're entitled to.


Development flow instructions:
This should integrate with the existing employee, leave balance, and leave type data we already have in the system.
Please store everything in the in-memory store for now (same pattern as other modules). We'll swap to a real database later.
We want proper validation — meaningful error messages, not just 500 errors.
Make sure all endpoints are protected. No unauthenticated access.

What We're NOT Building Right Now:
Email/push notifications (future sprint)
Calendar integration
Mobile app
Any kind of reporting dashboard (that's separate)

Roles
We have three roles in the system already: employee, manager, hr_admin. Please follow the appropriate access rules for each. Employees should only see and manage their own stuff. Managers see their team. HR sees everything.

The Functional flow will be,
Employee submits a request — they pick a leave type, choose their dates, and write a short reason.
It goes to their manager for review.
Manager approves or rejects. If they reject, they have to say why.
If approved, the leave is confirmed.
Employee can cancel their own request if they change their mind, but only if it hasn't been actioned yet (or maybe even after? HR wasn't sure — let's go with pending and approved for now, we can revisit).
HR can see and manage everything — they also sometimes submit requests on behalf of employees (e.g. if someone goes on sick leave unexpectedly and can't access the system).


HR should be able to:
See all requests across the company
Filter by employee, department, date range, status
Submit a request on behalf of someone else
Approve or reject any request (not just their team)
Cancel anything if needed


Here are some edge cases which needs to be handled:

When an approved leave is cancelled, should the days go back into the balance? (No answer from HR yet — flagged as TBD)

Do we need an audit trail of who approved what and when? (Probably yes, for compliance — add it if it's not too hard)

What happens if a manager is also an employee and submits their own leave? (HR: "someone above them approves it, or HR does it")