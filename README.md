[![npm version](https://img.shields.io/npm/v/@itrocks/edit-components?logo=npm)](https://www.npmjs.org/package/@itrocks/edit-components)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/edit-components?logo=npm)](https://www.npmjs.org/package/@itrocks/edit-components)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/edit-components?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/edit-components)
[![issues](https://img.shields.io/github/issues/itrocks-ts/edit-components)](https://github.com/itrocks-ts/edit-components/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=white)](https://25.re/ditr)

# edit-components

Edits collections of component objects in a table within their parent form.

## Usage

The framework activates the editor for properties such as `@Component() crew: CrewMember[]`.
Each column uses the same control as a regular form, selected from the property's type and decorators.
When the form opens, rows appear in the order declared by `@Sort` on the component class.
Use **Add row** and **−** to change the collection, then save the parent form.

## API

`editComponents(values, type, field)` renders the table fragment asynchronously.
Pass the current component objects, their class, and the parent field's HTML `id` and `name`,
with an optional plain-text `caption`. Use the `id` and `name` returned by `controlField` in
[`@itrocks/form-controls`](https://github.com/itrocks-ts/form-controls).

Row field names start at one, for example `crew.1.job`. Removing rows can leave gaps. A hidden
`crew._present` signals that the collection was submitted, including when all its rows were removed.
An existing row submits its ID as `crew.1.id`. For a recursive component type, save and reopen the
form to add a further level under a new row.

See [dependency wiring](docs/dependencies.md) for browser activation and replacement.
