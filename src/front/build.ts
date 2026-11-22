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

build('table.component-table', () => loadCss('/@itrocks/edit-components/edit-components.css'))

build<HTMLFieldSetElement>('fieldset.edit-components[data-row-token]', fieldset => {
	const table    = fieldset.querySelector<HTMLTableElement>(':scope > table')!
	const body     = table.tBodies[0]
	const actions  = fieldset.querySelector(':scope > .component-actions')!
	const add      = actions.querySelector<HTMLButtonElement>('[data-add-row]')!
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

	add.addEventListener('click', () => {
		const row = document.importNode(template.content, true)
		setRowIndex(row, fieldset.dataset.rowToken!, String(++ index))
		const control = row.querySelector<HTMLElement>(`[data-component-control] :is(${controlSelector})`)
		body.append(row)
		control?.focus()
	})
	body.addEventListener('click', event => {
		const cell = event.target
		if (
			!(cell instanceof HTMLTableCellElement)
			|| !cell.classList.contains('row-selection')
			|| (cell.closest('tbody') !== body)
		) {
			return
		}
		const checkbox = cell.querySelector<HTMLInputElement>('input[type=checkbox]')
		checkbox?.click()
		checkbox?.focus()
	})
	body.addEventListener('change', () => {
		remove.hidden = !body.querySelector(selection)
	})
	remove.addEventListener('click', () => {
		for (const checkbox of body.querySelectorAll(selection)) checkbox.closest('tr')!.remove()
		remove.hidden = true
		add.focus()
	})
})
