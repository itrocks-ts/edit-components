import { loadCss }        from '@itrocks/asset-loader/asset-loader.js'
import { build }          from '@itrocks/build/build.js'
import { TableEdit }      from '@itrocks/table/edit.js'
import { tableByElement } from '@itrocks/table/table.js'

const controlSelector   = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
const partialSelections = new WeakMap<HTMLTableElement, Set<HTMLInputElement>>()
const rowCheckboxes     = ':scope > tr > .row-selection > input[type=checkbox]'
const selection         = rowCheckboxes + ':checked'
const tableSelector     = 'table.component-table[data-row-token]'

function revealColumns(first: HTMLElement, last: HTMLElement, scrollStarts?: Map<HTMLElement, number>)
{
	const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
	for (let scroll = last.parentElement; scroll; scroll = scroll.parentElement) {
		if (scroll.scrollWidth <= scroll.clientWidth || !/^(auto|overlay|scroll)$/.test(getComputedStyle(scroll).overflowX)) {
			continue
		}
		const left        = scroll.getBoundingClientRect().left + scroll.clientLeft
		const right       = left + scroll.clientWidth
		const firstBounds = first.getBoundingClientRect()
		const lastBounds  = last.getBoundingClientRect()
		const start       = Math.min(firstBounds.left, lastBounds.left)
		const end         = Math.max(firstBounds.right, lastBounds.right)
		const offset      = (end > right) ? (end - right) : Math.min(0, start - left)
		if (!offset) continue
		scrollStarts?.set(scroll, scroll.scrollLeft)
		scroll.scrollBy({ behavior, left: offset })
	}
}

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

	for (const table of document.querySelectorAll<HTMLTableElement>(tableSelector)) {
		partialSelections.get(table)?.clear()
	}
})

build<HTMLTableElement>(tableSelector, table => {
	if (partialSelections.has(table)) return

	const body         = table.tBodies[0]
	const actions      = table.tFoot!
	const add          = table.tHead!.querySelector<HTMLButtonElement>('[data-insert-row="first"]')!
	const caption      = table.previousElementSibling?.querySelector<HTMLElement>(':scope:is(label) > [data-toggle-rows]')
	const columns      = table.tHead!.querySelector<HTMLButtonElement>('.component-column-toggle > button')!
	const headToggle   = table.tHead!.querySelector<HTMLInputElement>('[data-toggle-rows]')!
	const insertion    = add.parentElement!
	const partial      = new Set<HTMLInputElement>()
	const remove       = actions.querySelector<HTMLButtonElement>('[data-remove-rows]')!
	const removeOne    = remove.textContent!
	const scrollStarts = new Map<HTMLElement, number>()
	const template     = table.nextElementSibling as HTMLTemplateElement
	const toggle       = actions.querySelector<HTMLButtonElement>('[data-toggle-rows]')!
	let index          = body.rows.length
	let stripSlide: Animation | undefined
	partialSelections.set(table, partial)

	const plugin = new TableEdit({
		control: cell => cell.matches('[data-component-control]')
			? cell.querySelector<HTMLElement>(controlSelector)
			: null
	})
	tableByElement(table, { plugins: [plugin] })

	if (table.querySelector('input[type=file]') || template.content.querySelector('input[type=file]')) {
		const form = table.closest('form')
		if (form) form.enctype = 'multipart/form-data'
	}

	function insertRow(before: Element | null)
	{
		const row = document.importNode(template.content, true)
		setRowIndex(row, table.dataset.rowToken!, String(++ index))
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
		const pressed = mixed ? 'mixed' : String(count > 0)
		if (mixed || manual) partial.clear()
		if (mixed) {
			for (const checkbox of checked) partial.add(checkbox)
		}

		headToggle.checked       = count > 0 && !mixed
		headToggle.disabled      = !body.rows.length
		headToggle.indeterminate = mixed
		toggle.disabled          = headToggle.disabled || (columns.ariaExpanded === 'false')
		toggle.ariaPressed       = pressed
		if (caption) {
			caption.ariaDisabled = String(headToggle.disabled)
			caption.ariaPressed  = pressed
			caption.tabIndex      = headToggle.disabled ? -1 : 0
		}
		remove.inert = !count
		if (!count) return
		remove.textContent = (count === 1) ? removeOne : remove.dataset.removeRows!.replace('%count%', String(count))
	}

	function rotateSelection()
	{
		const checkboxes = [...body.querySelectorAll<HTMLInputElement>(rowCheckboxes)]
		const count      = checkboxes.filter(checkbox => checkbox.checked).length
		const restore    = !count && checkboxes.some(checkbox => partial.has(checkbox))
		for (const checkbox of checkboxes) {
			checkbox.checked = restore ? partial.has(checkbox) : (count < checkboxes.length)
		}
		updateSelection()
	}

	add.addEventListener('click', () => insertRow(body.firstElementChild))
	caption?.addEventListener('click', () => {
		if (!headToggle.disabled) rotateSelection()
	})
	caption?.addEventListener('keydown', event => {
		if ((event.key !== 'Enter') && (event.key !== ' ')) return
		event.preventDefault()
		if (!event.repeat) caption.click()
	})
	columns.addEventListener('click', () => {
		stripSlide?.cancel()
		stripSlide = undefined

		const expanding      = columns.ariaExpanded === 'false'
		const width          = insertion.offsetWidth + headToggle.parentElement!.offsetWidth
		columns.ariaExpanded = String(expanding)
		toggle.disabled      = headToggle.disabled || !expanding
		if (expanding) {
			scrollStarts.clear()
			revealColumns(insertion, columns, scrollStarts)
			return
		}

		const hiding = insertion.getAnimations().find(animation =>
			(animation instanceof CSSTransition) && (animation.transitionProperty === 'display'))
		const effect = hiding?.effect
		if (!hiding || !effect) {
			revealColumns(columns, columns)
			return
		}

		const shift = (getComputedStyle(table).direction === 'rtl') ? width : -width
		const slide = columns.animate({ translate: ['0px', `${shift}px`] }, {
			duration: effect.getComputedTiming().duration,
			easing:   'ease'
		})
		stripSlide = slide

		const positions = [...scrollStarts].map(([scroll, target]) => ({ from: scroll.scrollLeft, scroll, target }))
		const scrollBack = (progress: number) => {
			for (const { from, scroll, target } of positions) scroll.scrollLeft = from + (target - from) * progress
		}
		const frame = () => {
			if ((stripSlide !== slide) || !columns.isConnected) return
			const progress = effect.getComputedTiming().progress ?? 1
			scrollBack(progress)
			if (progress < 1) requestAnimationFrame(frame)
		}
		if (positions.length) requestAnimationFrame(frame)

		const settle = () => {
			if ((stripSlide !== slide) || !columns.isConnected) return
			stripSlide = undefined
			slide.cancel()
			scrollBack(1)
			revealColumns(columns, columns)
		}
		void hiding.finished.then(settle, settle)
	})
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
	headToggle.addEventListener('click', rotateSelection)
	headToggle.parentElement!.addEventListener('click', event => {
		if ((event.target === headToggle) || headToggle.disabled) return
		headToggle.click()
		headToggle.focus()
	})
	toggle.addEventListener('click', rotateSelection)
	remove.addEventListener('click', () => {
		for (const checkbox of body.querySelectorAll<HTMLInputElement>(selection)) {
			partial.delete(checkbox)
			checkbox.closest('tr')!.remove()
		}
		numberRows(body, false)
		updateSelection()
		const focusTarget = (columns.ariaExpanded === 'true') ? add : columns
		focusTarget.focus()
	})
	updateSelection()
})
