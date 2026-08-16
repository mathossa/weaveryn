# Authenticated app shell

Use `AuthenticatedAppShell` for production screens that require a signed-in User.
It resolves the session on the server and renders the shared `AppShell`.

Pass only backend-authorized World, Campaign, and Character context to the shell.
The shell presents that context; it does not decide whether the User may access it.

Desktop uses one top navigation bar. On phone-sized layouts the header becomes:

```text
logo | current context | profile
```

The compact context control shows the deepest active context and opens the full
World -> Campaign -> Character hierarchy in a bottom sheet.
