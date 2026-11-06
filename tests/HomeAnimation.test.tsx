import { fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeAnimation } from '../src/components/HomeAnimation'

afterEach(() => vi.restoreAllMocks())

it('restarts from the beginning if native looping ends on mobile', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const { container } = render(<HomeAnimation ko />)
  const video = container.querySelector('video')!
  video.currentTime = 10
  fireEvent.ended(video)
  expect(video.currentTime).toBe(0)
  expect(play).toHaveBeenCalledTimes(1)
  expect(video.muted).toBe(true)
  expect(video.defaultMuted).toBe(true)
})

it('recovers an end-of-video pause while respecting a manual pause', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const { container } = render(<HomeAnimation ko />)
  const video = container.querySelector('video')!
  video.currentTime = 5
  fireEvent.pause(video)
  expect(play).not.toHaveBeenCalled()
  expect(video.currentTime).toBe(5)
  Object.defineProperty(video, 'ended', { configurable: true, value: true })
  fireEvent.pause(video)
  expect(video.currentTime).toBe(0)
  expect(play).toHaveBeenCalledTimes(1)
})

it('handles a browser playback rejection without repeatedly forcing playback', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('Blocked', 'NotAllowedError'))
  const { container } = render(<HomeAnimation ko />)
  const video = container.querySelector('video')!
  fireEvent.ended(video)
  await Promise.resolve()
  expect(play).toHaveBeenCalledTimes(1)
  expect(video.controls).toBe(true)
})
