# Community templates

Current's template marketplace is an ordinary public GitHub repository — no
hosted service, no accounts, no lock-in. The app reads it over
`raw.githubusercontent.com`, and publishing is a pull request: **the PR queue
is the review queue**.

## Where templates come from

By default the app reads `csprech/current-templates` on `main`. Point it
anywhere with:

```
COMMUNITY_TEMPLATES_REPO=owner/repo          # or owner/repo@branch
```

Anyone can run their own marketplace by forking the repo layout below.

## Repo layout

```
index.json            # the catalog
templates/
  poster-maker.json   # shareable workflow exports
  ...
```

`index.json`:

```json
{
  "templates": [
    {
      "id": "poster-maker",
      "name": "Poster maker",
      "author": "yourhandle",
      "file": "poster-maker.json",
      "description": "Type a line, get a poster.",
      "tags": ["image"],
      "nodeCount": 3
    }
  ]
}
```

- `id`, `name`, `author`, `file` are required; the rest is optional.
- `file` resolves relative to `templates/`; prefix with `/` for a
  repo-root-relative path.
- Template files are **shareable workflow exports**: use Project menu →
  "Publish to community…" in the app. That export strips generated media and
  run state (small files, fresh open) and embeds `templateInterface` — the
  typed inputs/outputs that make the template runnable as a form in the App
  view, over `POST /api/run`, and from the CLI.

## Publishing from the app

Project menu → **Publish to community…** downloads the publish-ready JSON and
opens the repo's upload page. GitHub turns an upload from a non-collaborator
into a fork + pull request automatically. Maintainers review the PR — checking
the workflow opens cleanly and the metadata is honest — and merge; the app
picks it up within its 5-minute cache window.

## Review guidance for maintainers

- Open the file in Current (drag it onto the canvas) — it should load with no
  errors and run with only its declared inputs filled.
- `POST /api/run` with `{"validateOnly": true}` should return
  `success: true` and a sensible `templateInterface`.
- Keep files lean: generated media should already be stripped by the publish
  export; reject multi-megabyte files that embed outputs.
