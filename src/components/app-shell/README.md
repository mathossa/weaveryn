# Authenticated app shell

Use `AuthenticatedAppShell` for production screens that require a signed-in User.
It resolves the session on the server and renders the shared `AppShell`.

Pass only backend-authorized World, Campaign, and Character context to the shell.
The shell presents that context; it does not decide whether the User may access it.

Normal in-app screens integrate navigation into the existing application header. The
compact hamburger sits before the Weaveryn identity, while the existing World,
Campaign, and Character controls remain context switchers.

Opening the hamburger reveals a narrow left navigation rail that pushes the current
page inward instead of covering or blurring it. The rail keeps a stable structure
between World, Campaign, and Character screens so destinations do not jump around as
context changes. Unavailable destinations stay in place as disabled entries.

The navigation rail preserves an entered Campaign and Character when moving through
compatible World-level pages such as Overview, Entities, and Timeline. Those routes
validate the supplied context again before presenting it; carrying context through a
link never grants access on its own.

Normal in-app navigation keeps the rail open across route changes so users can move
between nearby destinations without reopening it. The same hamburger closes the rail,
and Escape remains available as a keyboard dismissal.

The rail contains only current in-world navigation. Character management remains a
launcher utility rather than an in-app navigation destination.

`Return to the Weave` leaves the current entry context and returns to `/select`.

Launcher variants do not render the in-app navigation control or rail, preserving the
cinematic `/select` experience.
