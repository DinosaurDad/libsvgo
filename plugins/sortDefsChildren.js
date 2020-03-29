const type = 'perItem'

const active = true

const description = 'Sorts children of <defs> to improve compression'

/**
 * Sorts children of defs in order to improve compression.
 * Sorted first by frequency then by element name length then by element name (to ensure grouping).
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author David Leston
 */
const fn = function (item) {
  if (item.isElem('defs')) {
    if (item.content) {
      const frequency = item.content.reduce(function (frequency, child) {
        if (child.elem in frequency) {
          frequency[ child.elem ]++
        } else {
          frequency[ child.elem ] = 1
        }
        return frequency
      }, {})
      item.content.sort(function (a, b) {
        const frequencyComparison = frequency[ b.elem ] - frequency[ a.elem ]
        if (frequencyComparison !== 0) {
          return frequencyComparison
        }
        const lengthComparison = b.elem.length - a.elem.length
        if (lengthComparison !== 0) {
          return lengthComparison
        }
        return a.elem !== b.elem ? a.elem > b.elem ? -1 : 1 : 0
      })
    }

    return true
  }
}

export {
  type,
  active,
  description,
  fn
}
