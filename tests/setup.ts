import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
configure({ asyncUtilTimeout: 10000 })
afterEach(cleanup)
Element.prototype.scrollIntoView = () => {}
window.confirm = () => true
window.matchMedia = query => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })
