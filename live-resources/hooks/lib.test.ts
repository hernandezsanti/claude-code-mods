import { expect, test } from 'claude-code/testing'

import { countRunners, formatStatus, levelOf, parseDfAvailable, parseVmStat } from './lib'

const VM = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                               10000.
Pages active:                            200000.
Pages inactive:                           50000.
Pages speculative:                         5000.
Pages purgeable:                           1000.
`

test('parseVmStat adds free, inactive, speculative and purgeable pages', () => {
  expect(parseVmStat(VM)).toBe((10000 + 50000 + 5000 + 1000) * 16384)
})

test('parseVmStat returns null when there is no page size', () => {
  expect(parseVmStat('nothing')).toBe(null)
})

test('parseDfAvailable reads the available column in bytes', () => {
  const df = `Device       1024-blocks      Used Available Capacity iused ifree %iused  Mounted on
/dev/disk3s1s1   494384795  12000000  20971520    37%  400000 4000 9%   /`
  expect(parseDfAvailable(df)).toBe(20971520 * 1024)
})

test('countRunners counts runners and does not count grep or ps', () => {
  const ps = [
    'node /x/node_modules/.bin/jest --maxWorkers=2',
    'node /x/jest-worker/processChild.js',
    'ruby bin/rspec spec/models',
    'grep -i jest',
    'ps -axo command',
    '/usr/bin/vim notes.md',
  ].join('\n')
  expect(countRunners(ps)).toBe(3)
})

test('levelOf tells ok, warn and critical apart', () => {
  const G = 1024 ** 3
  expect(levelOf(8 * G, 100 * G)).toBe('ok')
  expect(levelOf(2 * G, 100 * G)).toBe('warn')
  expect(levelOf(8 * G, 8 * G)).toBe('warn')
  expect(levelOf(8 * G, 13.5 * G)).toBe('ok')
  expect(levelOf(0.5 * G, 100 * G)).toBe('critical')
  expect(levelOf(8 * G, 3 * G)).toBe('critical')
})

test('formatStatus marks the level and shows the tests only when there are some', () => {
  const G = 1024 ** 3
  expect(formatStatus(8 * G, 100 * G, 0)).toBe('RAM 8.0G free · disk 100.0G')
  expect(formatStatus(0.5 * G, 100 * G, 2)).toBe('!! RAM 0.5G free · disk 100.0G · tests 2')
})
