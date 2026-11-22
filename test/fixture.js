const { File } = require('@itrocks/class-file')
const { Composite } = require('@itrocks/composition')
const { Sort } = require('@itrocks/sort')

class Row {
	label = ''
	order = 0
}

Composite()(Row.prototype, 'owner')
File(__filename)(Row)
Sort('order')(Row)

module.exports = { Row }
