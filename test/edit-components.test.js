const assert = require('node:assert/strict')
const test = require('node:test')
const { controlField, numberControl, textControl } = require('@itrocks/form-controls')
const { EDIT, HTML, setPropertyTypeTransformer } = require('@itrocks/transformer')
const { editComponents, outputComponents } = require('@itrocks/edit-components')
const { Row } = require('./fixture')

setPropertyTypeTransformer(Number, HTML, EDIT, (value, target, property, scope) =>
	numberControl(value, controlField(target, property, scope))
)
setPropertyTypeTransformer(String, HTML, EDIT, (value, target, property, scope) =>
	textControl(value, controlField(target, property, scope))
)

test('renders one-based sorted rows with editable fields, row ids and an empty row template', async () => {
	const later = Object.assign(new Row, { label: 'Later', order: 10, id: 14 })
	const first = Object.assign(new Row, { label: 'First', order: 2, id: 12 })
	const rows = [later, first]
	const field = { caption: 'Lines', id: 'lines', name: 'lines' }
	const html = await editComponents(rows, Row, field)

	assert.match(html, /<label id="lines-label">Lines<\/label>/)
	assert.match(html, /aria-labelledby="lines-label"/)
	assert.match(html, /type="checkbox" aria-label="Select row 1"/)
	assert.match(html, /class="component-actions" inert/)
	assert.match(html, /class="action delete" type="button" data-remove-rows>Delete<\/button>/)
	assert.match(html, /data-insert-row="after" aria-label="Insert row after"/)
	assert.equal((html.match(/data-insert-row="after"/g) ?? []).length, rows.length + 1)
	assert.match(html, /name="lines\.1\.id" value="12"/)
	assert.match(html, /name="lines\.2\.id" value="14"/)
	assert.match(html, /name="lines\.1\.label"[^>]*value="First"/)
	assert.match(html, /name="lines\.2\.order"[^>]*value="10"/)
	assert.match(html, /name="lines\._present" value="1"/)
	assert.match(html, /<template>[\s\S]+name="lines\.__itrocks_row_1__\.order"/)
	assert.doesNotMatch(html, /name="[^"]+\.owner"/)
	assert.deepEqual(rows, [later, first])
})

test('renders columns and an add button for an empty collection', async () => {
	const html = await editComponents([], Row, { id: 'lines', name: 'lines' })
	assert.match(html, /<th scope="col">Label<\/th>/i)
	assert.match(html, /<button type="button" data-insert-row="first" aria-label="Insert first row"/)
	assert.doesNotMatch(html, /<label|aria-labelledby|name="lines\.1\./)
})

test('renders sorted component values in the same columns without editing controls', async () => {
	const later = Object.assign(new Row, { label: 'Later', order: 10 })
	const first = Object.assign(new Row, { label: 'First', order: 2 })
	const html  = await outputComponents([later, first], Row, async (row, key) => String(row[key]))

	assert.match(html, /<table class="component-table" data-component-output\s*>/)
	assert.match(html, /<th scope="col">Label<\/th>[\s\S]*<th scope="col">Order<\/th>/i)
	assert.match(html, /<td\s*>First<\/td>[\s\S]*<td\s*>2<\/td>[\s\S]*<td\s*>Later<\/td>[\s\S]*<td\s*>10<\/td>/)
	assert.doesNotMatch(html, /<input|<button|data-component-control|row-insertion|row-selection|<th[^>]*>Owner/i)
})
