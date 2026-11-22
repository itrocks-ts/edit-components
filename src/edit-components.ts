import { Type }              from '@itrocks/class-type'
import { compositeOf }       from '@itrocks/composition'
import { escapeHtml }        from '@itrocks/form-controls'
import { renderControl }     from '@itrocks/form-controls'
import { displayOf }         from '@itrocks/property-view'
import { displayOrderOf }    from '@itrocks/property-view'
import { ReflectClass }      from '@itrocks/reflect'
import { Reverse }           from '@itrocks/sort'
import { sortOf }            from '@itrocks/sort'
import { MayEntity }         from '@itrocks/storage'
import { Template }          from '@itrocks/template'
import { tr }                from '@itrocks/translate'
import { AsyncLocalStorage } from 'node:async_hooks'

export type ComponentCollectionField = { caption?: string, id: string, name: string }

const templateTypes = new AsyncLocalStorage<readonly Type[]>()

async function sortValue(object: object, path: string[])
{
	let value: unknown = object
	for (const key of path) {
		if ((value === null) || (typeof value !== 'object')) return
		value = await (value as Record<string, unknown>)[key]
	}
	return (value instanceof Date) ? value.getTime() : value
}

async function sortedRows<T extends object>(values: readonly T[], type: Type<T>)
{
	const order = sortOf(type).map(path => ({
		direction: (path instanceof Reverse) ? -1 : 1,
		keys:      path.toString().split('.')
	}))
	if (!order.length) return values
	const rows = await Promise.all(values.map(async value => ({
		keys: await Promise.all(order.map(path => sortValue(value, path.keys))),
		value
	})))
	rows.sort((left, right) => {
		for (const [index, { direction }] of order.entries()) {
			const a = left.keys[index]
			const b = right.keys[index]
			if ((a === b) || ((a == null) && (b == null))) continue
			if (a == null) return direction
			if (b == null) return -direction
			const comparison = ((typeof a === 'number') || (typeof a === 'bigint')) && (typeof a === typeof b)
				? ((a < (b as typeof a)) ? -1 : 1)
				: String(a).localeCompare(String(b))
			if (comparison) return comparison * direction
		}
		return 0
	})
	return rows.map(row => row.value)
}

function componentColumns<T extends object>(type: Type<T>)
{
	const properties = new ReflectClass(type).propertyNames
	return displayOrderOf(type)
		.filter(property => (property !== 'id') && properties.includes(property) && !compositeOf(type, property))
		.map(name => ({ caption: escapeHtml(tr(displayOf(type, name))), name }))
}

export async function editComponents<T extends object>(
	values: readonly MayEntity<T>[], type: Type<T>, field: ComponentCollectionField
): Promise<string>
{
	const ancestors = templateTypes.getStore() ?? []
	// Stop expanding the blank-row template when a component type repeats.
	if (ancestors.includes(type)) return ''

	const columns   = componentColumns(type)
	const selectRow = escapeHtml(tr('Select row'))
	const rowToken  = '__itrocks_row_' + field.name.split('.').length + '__'
	const rows      = await sortedRows(values, type)
	const row       = async (value: MayEntity<T>, index: number | string) => {
		const prefix = field.name + '.' + index
		return {
			cells:      await Promise.all(columns.map(async ({ name }) => ({
				content: await renderControl<T>(value, name, prefix),
				editable: true
			}))),
			identifier: ('id' in value) && value.id ? escapeHtml(value.id) : '',
			prefix,
			selectRow: selectRow + ' ' + index
		}
	}

	return new Template({
		addRow:     escapeHtml(tr('Add row')),
		caption:    field.caption && escapeHtml(field.caption),
		columns,
		id:         field.id,
		name:       field.name,
		readOnly:   false,
		removeRows: escapeHtml(tr('Delete')),
		rowToken,
		rows:       await Promise.all(rows.map((value, index) => row(value, index + 1))),
		selectRow,
		template:   await templateTypes.run([...ancestors, type], () => row(new type, rowToken))
	}).parseFile(__dirname + '/edit-components.html')
}

export async function outputComponents<T extends object>(
	values: readonly MayEntity<T>[], type: Type<T>, propertyOutput: (object: T, property: keyof T) => Promise<string>
): Promise<string>
{
	const columns = componentColumns(type)
	const rows    = await sortedRows(values, type)
	return new Template({
		columns,
		readOnly: true,
		rows: await Promise.all(rows.map(async value => ({
			cells: await Promise.all(columns.map(async ({ name }) => ({
				content:  await propertyOutput(value, name),
				editable: false
			}))),
			selectRow: ''
		}))),
		selectRow: ''
	}).parseFile(__dirname + '/table.html')
}
