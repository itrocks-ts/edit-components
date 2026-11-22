import { loadCss }        from '@itrocks/asset-loader/asset-loader.js'
import { build }          from '@itrocks/build/build.js'
import { TableEdit }      from '@itrocks/table/edit.js'
import { tableByElement } from '@itrocks/table/table.js'

const controlSelector   = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
const partialSelections = new WeakMap<HTMLTableElement, Set<HTMLInputElement>>()
const rowCheckboxes     = ':scope > tr > .row-selection > input[type=checkbox]'
const selection         = rowCheckboxes + ':checked'

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

window.addEventListener('pagehide', () => {
	for (const table of document.querySelectorAll<HTMLTableElement>('fieldset.edit-components > table')) {
		partialSelections.get(table)?.clear()
	}
})

build<HTMLFieldSetElement>('fieldset.edit-components[data-row-token]', fieldset => {
	const table      = fieldset.querySelector<HTMLTableElement>(':scope > table')!
	if (partialSelections.has(table)) return

	const body       = table.tBodies[0]
	const actions    = fieldset.querySelector<HTMLElement>(':scope > .component-actions')!
	const actionRow  = actions.firstElementChild!
	const add        = table.tHead!.querySelector<HTMLButtonElement>('[data-insert-row="first"]')!
	const headToggle = table.tHead!.querySelector<HTMLButtonElement>('[data-toggle-rows]')!
	const partial    = new Set<HTMLInputElement>()
	const remove     = actions.querySelector<HTMLButtonElement>('[data-remove-rows]')!
	const removeOne  = remove.textContent!
	const template   = fieldset.querySelector<HTMLTemplateElement>(':scope > template')!
	const toggle     = actions.querySelector<HTMLButtonElement>('[data-toggle-rows]')!
	let index        = body.rows.length
	partialSelections.set(table, partial)

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
		updateSelection()
		control?.focus()
	}

	function updateSelection(manual = false)
	{
		const checked = body.querySelectorAll<HTMLInputElement>(selection)
		const count   = checked.length
		const mixed   = count > 0 && count < body.rows.length
		actions.removeAttribute('data-keep-open')
		if (mixed || manual) partial.clear()
		if (mixed) {
			for (const checkbox of checked) partial.add(checkbox)
		}

		for (const button of [headToggle, toggle]) {
			button.disabled = !body.rows.length
			button.setAttribute('aria-pressed', mixed ? 'mixed' : String(count > 0))
		}
		remove.inert = !count
		if (!count) return
		remove.textContent = (count === 1) ? removeOne : remove.dataset.removeRows!.replace('%count%', String(count))
	}

	function rotateSelection(keepActionsOpen = false)
	{
		const checkboxes = [...body.querySelectorAll<HTMLInputElement>(rowCheckboxes)]
		const count      = checkboxes.filter(checkbox => checkbox.checked).length
		const restore    = !count && checkboxes.some(checkbox => partial.has(checkbox))
		for (const checkbox of checkboxes) {
			checkbox.checked = restore ? partial.has(checkbox) : (count < checkboxes.length)
		}
		updateSelection()
		actions.toggleAttribute('data-keep-open', count > 0 && count === checkboxes.length && keepActionsOpen)
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
	body.addEventListener('change', event => {
		const checkbox = event.target
		if (checkbox instanceof HTMLInputElement && checkbox.matches('.row-selection > input[type=checkbox]')
			&& checkbox.closest('table') === table) updateSelection(true)
	})
	headToggle.addEventListener('click', () => rotateSelection())
	toggle.addEventListener('click', event => {
		// The label forwards both clicks and :hover to the button.
		const fromArrow = event.detail
			? document.elementFromPoint(event.clientX, event.clientY) === toggle
			: toggle.matches(':focus-visible')
		rotateSelection(fromArrow)
	})
	actionRow.addEventListener('pointerleave', () => actions.removeAttribute('data-keep-open'))
	toggle.addEventListener('blur', () => {
		if (!actionRow.matches(':hover')) actions.removeAttribute('data-keep-open')
	})
	remove.addEventListener('click', () => {
		for (const checkbox of body.querySelectorAll<HTMLInputElement>(selection)) {
			partial.delete(checkbox)
			checkbox.closest('tr')!.remove()
		}
		numberRows(body, false)
		updateSelection()
		add.focus()
	})
	updateSelection()
})
