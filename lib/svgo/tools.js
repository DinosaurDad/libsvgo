/**
 * Encode plain SVG data string into Data URI string.
 *
 * @param {String} str input string
 * @param {String} type Data URI type
 * @return {String} output string
 */
const encodeSVGDatauri = function (str, type) {
  const prefix = 'data:image/svg+xml'
  if (!type || type === 'base64') {
    // base64
    str = prefix + ';base64,' + Buffer.from(str).toString('base64')
  } else if (type === 'enc') {
    // URI encoded
    str = prefix + ',' + encodeURIComponent(str)
  } else if (type === 'unenc') {
    // unencoded
    str = prefix + ',' + str
  }
  return str
}

/**
 * Decode SVG Data URI string into plain SVG string.
 *
 * @param {string} str input string
 * @return {String} output string
 */
const decodeSVGDatauri = function (str) {
  const regexp = /data:image\/svg\+xml(;charset=[^;,]*)?(;base64)?,(.*)/
  const match = regexp.exec(str)

  // plain string
  if (!match) return str

  const data = match[ 3 ]

  if (match[ 2 ]) {
    // base64
    str = Buffer.from(data, 'base64').toString('utf8')
  } else if (data.charAt(0) === '%') {
    // URI encoded
    str = decodeURIComponent(data)
  } else if (data.charAt(0) === '<') {
    // unencoded
    str = data
  }
  return str
}

const intersectArrays = function (a, b) {
  return a.filter(function (n) {
    return b.indexOf(n) > -1
  })
}

/**
 * Convert a row of numbers to an optimized string view.
 *
 * @example
 * [0, -1, .5, .5] → "0-1 .5.5"
 *
 * @param {number[]} data
 * @param {Object} params
 * @param {string?} command path data instruction
 * @return {string}
 */
const cleanupOutData = function (data, params, command) {
  let str = ''
  let delimiter
  let prev

  data.forEach(function (item, i) {
    // space delimiter by default
    delimiter = ' '

    // no extra space in front of first number
    if (i === 0) delimiter = ''

    // no extra space after 'arcto' command flags
    if (params.noSpaceAfterFlags && (command === 'A' || command === 'a')) {
      const pos = i % 7
      if (pos === 4 || pos === 5) delimiter = ''
    }

    // remove floating-point numbers leading zeros
    // 0.5 → .5
    // -0.5 → -.5
    if (params.leadingZero) {
      item = removeLeadingZero(item)
    }

    // no extra space in front of negative number or
    // in front of a floating number if a previous number is floating too
    if (
      params.negativeExtraSpace &&
      delimiter !== '' &&
      (item < 0 ||
        (String(item).charCodeAt(0) === 46 && prev % 1 !== 0)
      )
    ) {
      delimiter = ''
    }
    // save prev item value
    prev = item
    str += delimiter + item
  })
  return str
}

/**
 * Remove floating-point numbers leading zero.
 *
 * @example
 * 0.5 → .5
 *
 * @example
 * -0.5 → -.5
 *
 * @param {Float} num input number
 *
 * @return {String} output number as string
 */
const removeLeadingZero = function (num) {
  let strNum = num.toString()

  if (num > 0 && num < 1 && strNum.charCodeAt(0) === 48) {
    strNum = strNum.slice(1)
  } else if (num > -1 && num < 0 && strNum.charCodeAt(1) === 48) {
    strNum = strNum.charAt(0) + strNum.slice(2)
  }
  return strNum
}

export {
  encodeSVGDatauri,
  decodeSVGDatauri,
  intersectArrays,
  cleanupOutData,
  removeLeadingZero
}
