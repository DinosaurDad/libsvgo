const name = 'removeXMLNS'

const type = 'perItem'

const active = false

const description = 'removes xmlns attribute (for inline svg, disabled by default)'

const params = {}

/**
 * Remove the xmlns attribute when present.
 *
 * @example
 * <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
 *   ↓
 * <svg viewBox="0 0 100 50">
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if true, xmlns will be filtered out
 *
 * @author Ricardo Tomasi
 */
const fn = function (item) {
  if (item.isElem('svg') && item.hasAttr('xmlns')) {
    item.removeAttr('xmlns')
  }
}

export { name, type, active, description, params, fn }
