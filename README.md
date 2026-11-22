[![npm version](https://img.shields.io/npm/v/@itrocks/edit-components?logo=npm)](https://www.npmjs.org/package/@itrocks/edit-components)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/edit-components?logo=npm)](https://www.npmjs.org/package/@itrocks/edit-components)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/edit-components?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/edit-components)
[![issues](https://img.shields.io/github/issues/itrocks-ts/edit-components)](https://github.com/itrocks-ts/edit-components/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=white)](https://25.re/ditr)

# edit-components

Displays and edits collections of component objects in a table.

## Usage

The framework activates the editor for properties such as `@Component() crew: CrewMember[]`.
Each column uses the same control as a regular form, selected from the property's type and decorators.
When the form opens, rows appear in the order declared by `@Sort` on the component class.
Click a cell in the insertion column to add a row below it. Click the column heading to add a row at the top,
including when the table is empty. Select rows to show **Delete**. Save the parent form to apply the changes.
Click the field label, the selection column header or the arrow below it to cycle through selecting all rows,
clearing the selection and restoring the last partial selection for that table. Check or uncheck all rows
individually to clear that memory and cycle between all and none. Leaving or reloading the form also clears it.
With no rows selected, the actions stay visible while the pointer is inside the action bar.

## API

`editComponents(values, type, field)` renders the table fragment asynchronously.
Pass the current component objects, their class, and the parent field's HTML `id` and `name`,
with an optional plain-text `caption`. Use the `id` and `name` returned by `controlField` in
[`@itrocks/form-controls`](https://github.com/itrocks-ts/form-controls).

Row field names follow the visible positions, starting at one, for example `crew.1.job`. A hidden
`crew._present` signals that the collection was submitted, including when all its rows were removed.
An existing row submits its ID as `crew.1.id`. For a recursive component type, save and reopen the
form to add a further level under a new row.

`outputComponents(values, type, propertyOutput)` displays the same sorted rows and columns in a read-only table.
The callback renders each value using the application’s normal output rules.

See [dependency wiring](docs/dependencies.md) for browser activation and replacement.
