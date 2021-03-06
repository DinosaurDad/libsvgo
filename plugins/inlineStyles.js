import csstree from 'css-tree'
import {
  flattenToSelectors,
  filterByMqs,
  filterByPseudos,
  cleanPseudos,
  sortSelectors,
  csstreeToStyleDeclaration,
  getCssStr,
  setCssStr
} from '../lib/css-tools'

const name = 'inlineStyles'

const type = 'full'

const active = true

const params = {
  onlyMatchedOnce: true,
  removeMatchedSelectors: true,
  useMqs: [ '', 'screen' ],
  usePseudos: [ '' ]
}

const description = 'inline styles (additional options)'

/**
 * Moves + merges styles from style elements to element styles
 *
 * Options
 *   onlyMatchedOnce (default: true)
 *     inline only selectors that match once
 *
 *   removeMatchedSelectors (default: true)
 *     clean up matched selectors,
 *     leave selectors that hadn't matched
 *
 *   useMqs (default: ['', 'screen'])
 *     what media queries to be used
 *     empty string element for styles outside media queries
 *
 *   usePseudos (default: [''])
 *     what pseudo-classes/-elements to be used
 *     empty string element for all non-pseudo-classes and/or -elements
 *
 * @param {Object} document document element
 * @param {Object} opts plugin params
 *
 * @author strarsis <strarsis@gmail.com>
 */
const fn = function (document, opts) {
  // collect <style/>s
  const styleEls = document.querySelectorAll('style')

  // no <styles/>s, nothing to do
  if (styleEls === null) {
    return document
  }

  const styles = []
  let selectors = []

  for (const styleEl of styleEls) {
    if (styleEl.isEmpty() || styleEl.closestElem('foreignObject')) {
      // skip empty <style/>s or <foreignObject> content.
      continue
    }

    const cssStr = getCssStr(styleEl)

    // collect <style/>s and their css ast
    let cssAst = {}
    try {
      cssAst = csstree.parse(cssStr, {
        parseValue: false,
        parseCustomProperty: false
      })
    } catch (parseError) {
      // console.warn('Warning: Parse error of styles of <style/> element, skipped. Error details: ' + parseError);
      continue
    }

    styles.push({
      styleEl: styleEl,
      cssAst: cssAst
    })

    selectors = selectors.concat(flattenToSelectors(cssAst))
  }

  // filter for mediaqueries to be used or without any mediaquery
  const selectorsMq = filterByMqs(selectors, opts.useMqs)

  // filter for pseudo elements to be used
  const selectorsPseudo = filterByPseudos(selectorsMq, opts.usePseudos)

  // remove PseudoClass from its SimpleSelector for proper matching
  cleanPseudos(selectorsPseudo)

  // stable sort selectors
  const sortedSelectors = sortSelectors(selectorsPseudo).reverse()

  let selector
  let selectedEl

  // match selectors
  for (selector of sortedSelectors) {
    const selectorStr = csstree.generate(selector.item.data)
    let selectedEls = null

    try {
      selectedEls = document.querySelectorAll(selectorStr)
    } catch (selectError) {
      if (selectError.message.includes('Unmatched selector:')) {
        // console.warn('Warning: Syntax error when trying to select \n\n' + selectorStr + '\n\n, skipped. Error details: ' + selectError);
        continue
      }
      throw selectError
    }

    if (selectedEls === null) {
      // nothing selected
      continue
    }

    selector.selectedEls = selectedEls
  }

  // apply <style/> styles to matched elements
  for (selector of sortedSelectors) {
    if (!selector.selectedEls) {
      continue
    }

    if (opts.onlyMatchedOnce && selector.selectedEls !== null && selector.selectedEls.length > 1) {
      // skip selectors that match more than once if option onlyMatchedOnce is enabled
      continue
    }

    // apply <style/> to matched elements
    for (selectedEl of selector.selectedEls) {
      if (selector.rule === null) {
        continue
      }

      // merge declarations
      csstree.walk(selector.rule, {
        visit: 'Declaration', enter: function (styleCsstreeDeclaration) {
          // existing inline styles have higher priority
          // no inline styles, external styles,                                    external styles used
          // inline styles,    external styles same   priority as inline styles,   inline   styles used
          // inline styles,    external styles higher priority than inline styles, external styles used
          const styleDeclaration = csstreeToStyleDeclaration(styleCsstreeDeclaration)
          if (selectedEl.style.getPropertyValue(styleDeclaration.name) !== null &&
            selectedEl.style.getPropertyPriority(styleDeclaration.name) >= styleDeclaration.priority) {
            return
          }
          selectedEl.style.setProperty(styleDeclaration.name, styleDeclaration.value, styleDeclaration.priority)
        }
      })
    }

    if (opts.removeMatchedSelectors && selector.selectedEls !== null && selector.selectedEls.length > 0) {
      // clean up matching simple selectors if option removeMatchedSelectors is enabled
      selector.rule.prelude.children.remove(selector.item)
    }
  }

  if (!opts.removeMatchedSelectors) {
    return document // no further processing required
  }

  // clean up matched class + ID attribute values
  for (selector of sortedSelectors) {
    if (!selector.selectedEls) {
      continue
    }

    if (opts.onlyMatchedOnce && selector.selectedEls !== null && selector.selectedEls.length > 1) {
      // skip selectors that match more than once if option onlyMatchedOnce is enabled
      continue
    }

    for (selectedEl of selector.selectedEls) {
      // class
      const firstSubSelector = selector.item.data.children.first()
      if (firstSubSelector.type === 'ClassSelector') {
        selectedEl.class.remove(firstSubSelector.name)
      }
      // clean up now empty class attributes
      if (typeof selectedEl.class.item(0) === 'undefined') {
        selectedEl.removeAttr('class')
      }

      // ID
      if (firstSubSelector.type === 'IdSelector') {
        selectedEl.removeAttr('id', firstSubSelector.name)
      }
    }
  }

  // clean up now empty elements
  for (const style of styles) {
    csstree.walk(style.cssAst, {
      visit: 'Rule', enter: function (node, item, list) {
        // clean up <style/> atrules without any rulesets left
        if (node.type === 'Atrule' &&
          // only Atrules containing rulesets
          node.block !== null &&
          node.block.children.isEmpty()) {
          list.remove(item)
          return
        }

        // clean up <style/> rulesets without any css selectors left
        if (node.type === 'Rule' &&
          node.prelude.children.isEmpty()) {
          list.remove(item)
        }
      }
    })

    if (style.cssAst.children.isEmpty()) {
      // clean up now emtpy <style/>s
      const styleParentEl = style.styleEl.parentNode
      styleParentEl.spliceContent(styleParentEl.content.indexOf(style.styleEl), 1)

      if (styleParentEl.elem === 'defs' &&
        styleParentEl.content.length === 0) {
        // also clean up now empty <def/>s
        const defsParentEl = styleParentEl.parentNode
        defsParentEl.spliceContent(defsParentEl.content.indexOf(styleParentEl), 1)
      }

      continue
    }

    // update existing, left over <style>s
    setCssStr(style.styleEl, csstree.generate(style.cssAst))
  }

  return document
}

export { name, type, active, description, params, fn }
