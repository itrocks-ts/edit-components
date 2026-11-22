import { loadCss }        from '@itrocks/asset-loader/asset-loader.js'
import { build }          from '@itrocks/build/build.js'
import { TableEdit }      from '@itrocks/table/edit.js'
import { tableByElement } from '@itrocks/table/table.js'

const controlSelector = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'

function setRowIndex(fragment: DocumentFragment, token: string, index: string)
{
	for (const element of fragment.querySelectorAll('*')) {
		for (const attribute of element.attributes) {
			if (attribute.value.includes(token)) attribute.value = attribute.value.replaceAll(token, index)
		}
		if (element instanceof HTMLTemplateElement) setRowIndex(element.content, token, index)
	}
}

build<HTMLFieldSetElement>('fieldset.edit-components[data-row-token]', fieldset => {
	loadCss('/@itrocks/edit-components/edit-components.css')
	const table    = fieldset.querySelector<HTMLTableElement>(':scope > table')!
	const body     = table.tBodies[0]
	const add      = fieldset.querySelector<HTMLButtonElement>(':scope > [data-add-row]')!
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
		const control = row.querySelector<HTMLElement>(controlSelector)
		body.append(row)
		control?.focus()
	})
	body.addEventListener('click', event => {
		const button = (event.target as Element).closest('[data-remove-row]')
		if (!button || (button.closest('tbody') !== body)) return
		const row = button.closest('tr')!
		const sibling = row.nextElementSibling ?? row.previousElementSibling
		const control = sibling?.querySelector<HTMLElement>(controlSelector) ?? add
		row.remove()
		control.focus()
	})
})
