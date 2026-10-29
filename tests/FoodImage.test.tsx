import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FoodImage } from '../src/components/FoodImage'

it('uses the same placeholder for absent and failed images and loads a changed URL', () => {
  const view = render(<FoodImage alt="Food" />)
  const placeholder = screen.getByRole('img', { name: 'Food' }).innerHTML
  expect(placeholder).toContain('<svg')
  view.rerender(<FoodImage src="broken.jpg" alt="Food" />)
  fireEvent.error(screen.getByRole('img', { name: 'Food' }))
  expect(screen.getByRole('img', { name: 'Food' }).innerHTML).toBe(placeholder)
  view.rerender(<FoodImage src="new.jpg" alt="Food" />)
  expect(screen.getByRole('img', { name: 'Food' }).getAttribute('src')).toBe('new.jpg')
})
