/*
 * Copyright (C) 2018 The 'MysteriumNetwork/mysterium-vpn-mobile' Authors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Connection from '../../../../src/app/domain/connection'
import { TimeProvider } from '../../../../src/libraries/statistics/events/connect-event-builder'
import TequilApiState from '../../../../src/libraries/tequil-api/tequil-api-state'
import { MockConnectionAdapter } from '../../mocks/mock-connection-adapter'
import MockEventSender from '../../mocks/mock-event-sender'
import MockTimeProvider from '../../mocks/mock-time-provider'

function nextTick (): Promise<void> {
  return new Promise((resolve) => {
    process.nextTick(() => {
      resolve()
    })
  })
}

describe('Connection', () => {
  let connection: Connection
  let connectionAdapter: MockConnectionAdapter
  let state: TequilApiState
  let eventSender: MockEventSender
  let timeProvider: TimeProvider

  beforeEach(() => {
    state = new TequilApiState()
    connectionAdapter = new MockConnectionAdapter()
    eventSender = new MockEventSender()
    timeProvider = (new MockTimeProvider()).timeProvider
    connection = new Connection(connectionAdapter, state, timeProvider, eventSender)
  })

  describe('.startUpdating', () => {
    afterEach(() => {
      connection.stopUpdating()
    })

    it('fetches status when identity is set', async () => {
      state.identityId = 'mock identity'

      expect(connection.data.status).toEqual('NotConnected')

      connection.startUpdating()
      await nextTick()

      expect(connection.data.status).toEqual('Connected')
    })

    it('fetches ip', async () => {
      expect(connection.data.IP).toBeNull()

      connection.startUpdating()
      await nextTick()

      expect(connection.data.IP).toEqual('100.101.102.103')
    })
  })

  describe('.connect', () => {
    it('changes connecting status to connecting', async () => {
      const promise = connection.connect('consumer id', 'provider id', '')
      expect(connection.data.status).toEqual('Connecting')
      await promise
    })

    it('sends successful connection event', async () => {
      await connection.connect('consumer id', 'provider id', 'us')
      expect(eventSender.sentEvent).toEqual(buildEvent('connect_successful'))
    })

    it('sends failed connection event', async () => {
      const event = buildEvent('connect_failed', 'Connection failed')

      connectionAdapter.throwConnectError = true
      await connection.connect('consumer id', 'provider id', 'us')
      expect(eventSender.sentEvent).toEqual(event)
    })

    it('sends connection canceled event', async () => {
      connectionAdapter.throwConnectCancelledError = true
      await connection.connect('consumer id', 'provider id', 'us')
      expect(eventSender.sentEvent).toEqual(buildEvent('connect_canceled'))
    })
  })

  describe('.disconnect', () => {
    it('changes connecting status to disconnecting', async () => {
      const promise = connection.disconnect()
      expect(connection.data.status).toEqual('Disconnecting')
      await promise
    })
  })
})

function buildEvent (name: string, error?: string | null) {
  return {
    eventName: name,
    context: {
      startedAt: { utcTime: 1, localTime: 1 },
      endedAt: { utcTime: 2, localTime: 2 },
      timeDelta: 1,
      originalCountry: 'lt',
      providerCountry: 'us',
      connectDetails: { consumerId: 'consumer id', providerId: 'provider id' },
      error
    },
    createdAt: 1
  }
}
