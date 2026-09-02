# Authenticated app shell

Use `AuthenticatedAppShell` for production screens that require a signed-in User.
It resolves the session on the server and renders the shared `AppShell`.

Pass only backend-authorized World, Campaign, and Character context to the shell.
The shell presents that context; it does not decide whether the User may access it.

Normal in-app screens also render `InAppNavigation` directly inside the authenticated
shell. It separates two jobs that were previously mixed together:

- the existing header context controls switch to another authorized World, Campaign,
  or Character;
- the in-app navigation bar and drawer navigate through the current hierarchy and
  common non-privileged workspace destinations.

The breadcrumb trail uses the authorized context links supplied by the page. It does
not infer access to a parent object. Derived World workspace links are shown only when
an authorized World context exists and remain subject to the normal server-side route
authorization.

Launcher variants do not render the in-app navigation bar or drawer, preserving the
cinematic `/select` experience.

Desktop keeps the existing top context switchers and adds a compact hierarchy bar
below them. On phone-sized layouts the header remains:

```text
logo | current context | profile
```

The compact context control still opens the World -> Campaign -> Character switcher.
A separate hamburger control in the hierarchy bar opens normal navigation, so users
can move upward without using a context switcher.
