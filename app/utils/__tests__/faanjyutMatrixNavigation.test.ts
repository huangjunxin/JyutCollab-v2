import { describe, expect, it } from 'vitest'
import {
  FAANJYUT_MATRIX_RETURN_STATE_KEY,
  getFaanjyutMatrixReturnPath
} from '../faanjyutMatrixNavigation'

describe('faanjyutMatrixNavigation', () => {
  it('restores the stored matrix view including its query', () => {
    expect(getFaanjyutMatrixReturnPath({
      [FAANJYUT_MATRIX_RETURN_STATE_KEY]: '/faanjyut?q=%E7%BE%8A'
    })).toBe('/faanjyut?q=%E7%BE%8A')
  })

  it('uses the immediate history entry when it is the matrix', () => {
    expect(getFaanjyutMatrixReturnPath({ back: '/faanjyut?cell=DR18' }))
      .toBe('/faanjyut?cell=DR18')
  })

  it('keeps a stored matrix origin across related detail navigation', () => {
    expect(getFaanjyutMatrixReturnPath({
      [FAANJYUT_MATRIX_RETURN_STATE_KEY]: '/faanjyut?q=maa5',
      back: '/faanjyut/lexemes/fjl_other'
    })).toBe('/faanjyut?q=maa5')
  })

  it('rejects non-matrix return locations', () => {
    expect(getFaanjyutMatrixReturnPath({ back: '/entries' })).toBeNull()
    expect(getFaanjyutMatrixReturnPath({
      [FAANJYUT_MATRIX_RETURN_STATE_KEY]: '/faanjyut/lexemes/fjl_1'
    })).toBeNull()
  })
})
