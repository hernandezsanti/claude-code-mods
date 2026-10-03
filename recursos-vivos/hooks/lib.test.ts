import { expect, test } from 'claude-code/testing'

import { countRunners, formatStatus, levelOf, parseDfAvailable, parseVmStat } from './lib'

const VM = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                               10000.
Pages active:                            200000.
Pages inactive:                           50000.
Pages speculative:                         5000.
Pages purgeable:                           1000.
`

test('parseVmStat suma libre, inactiva, especulativa y purgable', () => {
  expect(parseVmStat(VM)).toBe((10000 + 50000 + 5000 + 1000) * 16384)
})

test('parseVmStat devuelve null si no hay tamaño de página', () => {
  expect(parseVmStat('nada')).toBe(null)
})

test('parseDfAvailable lee la columna disponible en bytes', () => {
  const df = `Device       1024-blocks      Used Available Capacity iused ifree %iused  Mounted on
/dev/disk3s1s1   494384795  12000000  20971520    37%  400000 4000 9%   /`
  expect(parseDfAvailable(df)).toBe(20971520 * 1024)
})

test('countRunners cuenta runners y no cuenta grep ni ps', () => {
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

test('levelOf distingue ok, warn y critical', () => {
  const G = 1024 ** 3
  expect(levelOf(8 * G, 100 * G)).toBe('ok')
  expect(levelOf(2 * G, 100 * G)).toBe('warn')
  expect(levelOf(8 * G, 8 * G)).toBe('warn')
  expect(levelOf(8 * G, 13.5 * G)).toBe('ok')
  expect(levelOf(0.5 * G, 100 * G)).toBe('critical')
  expect(levelOf(8 * G, 3 * G)).toBe('critical')
})

test('formatStatus marca el nivel y muestra los tests solo si hay', () => {
  const G = 1024 ** 3
  expect(formatStatus(8 * G, 100 * G, 0)).toBe('RAM 8.0G libre · disco 100.0G')
  expect(formatStatus(0.5 * G, 100 * G, 2)).toBe('!! RAM 0.5G libre · disco 100.0G · tests 2')
})
