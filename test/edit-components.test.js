const assert = require('node:assert/strict')
const test = require('node:test')
const { controlField, numberControl, textControl } = require('@itrocks/form-controls')
const { EDIT, HTML, setPropertyTypeTransformer } = require('@itrocks/transformer')
const { editComponents } = require('@itrocks/edit-components')
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

	assert.match(html, /<legend>Lines<\/legend>/)
	assert.equal(html.match(/<legend>/g).length, 1)
	assert.match(html, /name="lines\.1\.id" value="12"/)
	assert.match(html, /name="lines\.2\.id" value="14"/)
	assert.match(html, /name="lines\.1\.label"[^>]*value="First"/)
	assert.match(html, /name="lines\.2\.order"[^>]*value="10"/)
	assert.match(html, /name="lines\._present" value="1"/)
	assert.match(html, /<template>[\s\S]+name="lines\.__itrocks_row_1__\.order"/)
	assert.doesNotMatch(html, /name="[^"]+\.owner"|<label/)
	assert.deepEqual(rows, [later, first])
})

test('renders columns and an add button for an empty collection', async () => {
	const html = await editComponents([], Row, { id: 'lines', name: 'lines' })
	assert.match(html, /<th scope="col">Label<\/th>/i)
	assert.match(html, /<button type="button" data-add-row>/)
	assert.doesNotMatch(html, /<legend>|name="lines\.1\./)
})
