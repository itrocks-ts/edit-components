import { loadCss }        from '@itrocks/asset-loader/asset-loader.js'
import { build }          from '@itrocks/build/build.js'
import { TableEdit }      from '@itrocks/table/edit.js'
import { tableByElement } from '@itrocks/table/table.js'

const controlSelector = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
const selection       = ':scope > tr > .row-selection > input:checked'

function setRowIndex(fragment: DocumentFragment, token: string, index: string)
{
	for (const element of fragment.querySelectorAll('*')) {
		for (const attribute of element.attributes) {
			if (attribute.value.includes(token)) attribute.value = attribute.value.replaceAll(token, index)
		}
		if (element instanceof HTMLTemplateElement) setRowIndex(element.content, token, index)
	}
}

function renameFields(root: DocumentFragment | HTMLElement, from: string, to: string)
{
	for (const element of root.querySelectorAll('[name], [data-field-name], template')) {
		for (const attribute of ['name', 'data-field-name']) {
			const value = element.getAttribute(attribute)
			if (value?.startsWith(from)) element.setAttribute(attribute, to + value.slice(from.length))
		}
		if (element instanceof HTMLTemplateElement) renameFields(element.content, from, to)
	}
}

function numberRows(body: HTMLTableSectionElement, inserting: boolean)
{
	const rows = Array.from(body.rows, (row, index) => ({ row, number: String(index + 1) }))
	// Move field names into freed positions, keeping radio groups separate.
	if (inserting) rows.reverse()
	for (const { row, number } of rows) {
		const id     = row.querySelector<HTMLInputElement>(':scope > .row-selection > input[type=hidden]')!
		const check  = row.querySelector<HTMLInputElement>(':scope > .row-selection > input[type=checkbox]')!
		const from   = id.name.slice(0, -2)
		const to     = from.replace(/\d+\.$/, number + '.')
		// Keep DOM IDs stable for controls that are already active.
		if (from !== to) {
			renameFields(row, from, to)
		}
		check.setAttribute('aria-label', check.getAttribute('aria-label')!.replace(/\d+$/, number))
	}
}

build('table.component-table', () => loadCss('/@itrocks/edit-components/edit-components.css'))

build<HTMLFieldSetElement>('fieldset.edit-components[data-row-token]', fieldset => {
	const table    = fieldset.querySelector<HTMLTableElement>(':scope > table')!
	const body     = table.tBodies[0]
	const actions  = fieldset.querySelector<HTMLElement>(':scope > .component-actions')!
	const add      = table.tHead!.querySelector<HTMLButtonElement>('[data-insert-row="first"]')!
	const remove   = actions.querySelector<HTMLButtonElement>('[data-remove-rows]')!
	const template = fieldset.querySelector<HTMLTemplateElement>(':scope > template')!
	let index      = body.rows.length

	const plugin = new TableEdit({
		control: cell => cell.matches('[data-component-control]')
			? cell.querySelector<HTMLElement>(controlSelector)
			: null
	})
	tableByElement(table, { plugins: [plugin] })

	if (table.querySelector('input[type=file]') || template.content.querySelector('input[type=file]')) {
		if (fieldset.form) fieldset.form.enctype = 'multipart/form-data'
	}

	function insertRow(before: Element | null)
	{
		const row = document.importNode(template.content, true)
		setRowIndex(row, fieldset.dataset.rowToken!, String(++ index))
		const control = row.querySelector<HTMLElement>(`[data-component-control] :is(${controlSelector})`)
		body.insertBefore(row, before)
		numberRows(body, true)
		control?.focus()
	}

	add.addEventListener('click', () => insertRow(body.firstElementChild))
	body.addEventListener('click', event => {
		const target = event.target
		if (!(target instanceof HTMLElement) || (target.closest('table') !== table)) return
		const cell = target.closest('td')
		if (cell?.classList.contains('row-insertion')) {
			insertRow(cell.parentElement!.nextElementSibling)
			return
		}
		if (!(target instanceof HTMLTableCellElement) || !target.classList.contains('row-selection')) return
		const checkbox = target.querySelector<HTMLInputElement>('input[type=checkbox]')
		checkbox?.click()
		checkbox?.focus()
	})
	body.addEventListener('change', () => {
		actions.inert = !body.querySelector(selection)
	})
	remove.addEventListener('click', () => {
		for (const checkbox of body.querySelectorAll(selection)) checkbox.closest('tr')!.remove()
		numberRows(body, false)
		actions.inert = true
		add.focus()
	})
})
