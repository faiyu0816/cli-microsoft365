# spo list webhook list

Lists all webhooks for the specified list

## Usage

```sh
m365 spo list webhook list [options]
```

## Options

`-u, --webUrl <webUrl>`
: URL of the site where the list is located.

`-i, --listId [listId]`
: ID of the list. Specify either `id`, `title`, `listTitle`, `listId` or `listUrl`.

`-t, --listTitle [listTitle]`
: Title of the list. Specify either `id`, `title`, `listTitle`, `listId` or `listUrl`.

`--listUrl [listUrl]`
: Server- or site-relative URL of the list. Specify either `id`, `title`, `listTitle`, `listId` or `listUrl`.

`--id [id]`
: (deprecated. Use `listId` instead) ID of the list to retrieve all webhooks for. Specify either `id`, `title`, `listTitle`, `listId` or `listUrl`.

`--title [title]`
: (deprecated. Use `listTitle` instead) Title of the list to retrieve all webhooks for. Specify either `id`, `title`, `listTitle`, `listId` or `listUrl`.

--8<-- "docs/cmd/_global.md"

## Examples

List all webhooks for a list with a specific ID in a specific site

```sh
m365 spo list webhook list --webUrl https://contoso.sharepoint.com/sites/project-x --listId 0cd891ef-afce-4e55-b836-fce03286cccf
```

List all webhooks for a list with a specific title in a specific site

```sh
m365 spo list webhook list --webUrl https://contoso.sharepoint.com/sites/project-x --listTitle Documents
```

List all webhooks for a list with a specific URL in a specific site

```sh
m365 spo list webhook list --webUrl https://contoso.sharepoint.com/sites/project-x --listUrl '/sites/project-x/Documents'
```
